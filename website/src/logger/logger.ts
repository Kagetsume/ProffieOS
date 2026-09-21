/**
 * Timestamped console wrapper with per-level enable flags.
 *
 * The logger mirrors the familiar `console` API (`log`, `debug`, `warn`, `error`) but
 * prepends every emission with the current time in **ISO 8601** format and allows each
 * level to be turned on or off at runtime.
 *
 * ## Why use this instead of `console` directly?
 *
 * - **Consistent timestamps** — every line starts with `[2026-09-21T03:14:00.000Z]` so
 *   DevTools output is easy to correlate with user reports or network traces.
 * - **Runtime filtering** — silence noisy `debug` output in production while keeping
 *   `warn` and `error` enabled, without sprinkling `if` guards through call sites.
 * - **Drop-in replacement** — same variadic signature as `console.*`; pass strings,
 *   objects, errors, or any mix of values.
 *
 * ## Timestamp formatting rules
 *
 * The logger never mutates your original arguments. It builds a **new** argument list
 * for the underlying `console` call:
 *
 * | Call | Arguments sent to `console` |
 * |------|-----------------------------|
 * | `logger.log('ready')` | `'[ISO8601] ready'` |
 * | `logger.log('count', 3)` | `'[ISO8601] count', 3` |
 * | `logger.log({ id: 1 })` | `'[ISO8601]', { id: 1 }` |
 * | `logger.log(42, 'extra')` | `'[ISO8601]', 42, 'extra'` |
 * | `logger.log()` | `'[ISO8601]'` |
 *
 * When the **first** argument is a string, it is merged into the timestamp prefix:
 * `"[ISO8601] your message"`. When the first argument is anything else (object, number,
 * `Error`, `undefined`, etc.), the prefix stands alone as its own argument so DevTools
 * can expand the object on the next line unchanged.
 *
 * ## Configuration
 *
 * All four levels default to **enabled**. Use {@link configureLogger} to toggle them:
 *
 * ```ts
 * configureLogger({ debug: false, log: import.meta.env.DEV });
 * ```
 *
 * Disabled levels are completely silent — no console call, no thrown errors.
 *
 * @module logger/logger
 * @see {@link logger} for the shared instance used at call sites
 * @see {@link configureLogger} to enable or disable levels at runtime
 */

/** Supported logging levels, matching the mirrored `console` methods. */
export type LogLevel = 'log' | 'debug' | 'warn' | 'error';

/**
 * Per-level on/off switches. Every level defaults to `true` until changed via
 * {@link configureLogger} or reset via {@link resetLoggerConfig}.
 */
export type LoggerConfig = Record<LogLevel, boolean>;

const DEFAULT_CONFIG: LoggerConfig = {
  log: true,
  debug: true,
  warn: true,
  error: true,
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };
let getTimestamp = (): string => new Date().toISOString();

/**
 * Merge partial settings into the active logger configuration.
 *
 * Unspecified levels keep their current value. Settings persist for the lifetime of
 * the page unless {@link resetLoggerConfig} is called.
 *
 * @example
 * ```ts
 * // Silence debug noise during normal use
 * configureLogger({ debug: false });
 *
 * // Production: only warnings and errors
 * configureLogger({ log: false, debug: false, warn: true, error: true });
 * ```
 *
 * @param settings — Partial map of level → enabled. `true` emits; `false` silences.
 */
export function configureLogger(settings: Partial<LoggerConfig>): void {
  config = { ...config, ...settings };
}

/**
 * Restore all log levels to **enabled** (`true`).
 *
 * Useful in tests to avoid leaking configuration between cases, or to undo a
 * temporary `configureLogger` call during debugging.
 */
export function resetLoggerConfig(): void {
  config = { ...DEFAULT_CONFIG };
}

/**
 * Read whether a log level is currently enabled.
 *
 * @param level — One of `'log' | 'debug' | 'warn' | 'error'`.
 * @returns `true` if calls to that level will reach the console; `false` if silenced.
 *
 * @example
 * ```ts
 * configureLogger({ debug: false });
 * isLoggerEnabled('debug'); // false
 * isLoggerEnabled('error'); // true
 * ```
 */
export function isLoggerEnabled(level: LogLevel): boolean {
  return config[level];
}

/**
 * Override the timestamp source.
 *
 * **Tests only** — inject a fixed clock so assertions on formatted output are stable.
 * Always pair with {@link resetLoggerTimestampProvider} in `afterEach`.
 *
 * @param provider — Function returning an ISO 8601 string (without brackets).
 *
 * @example
 * ```ts
 * setLoggerTimestampProvider(() => '2026-09-21T03:14:00.000Z');
 * logger.log('ping'); // console.log('[2026-09-21T03:14:00.000Z] ping')
 * ```
 */
export function setLoggerTimestampProvider(provider: () => string): void {
  getTimestamp = provider;
}

/**
 * Restore live clock timestamps (`new Date().toISOString()`).
 *
 * Call in test teardown after {@link setLoggerTimestampProvider}.
 */
export function resetLoggerTimestampProvider(): void {
  getTimestamp = () => new Date().toISOString();
}

/**
 * Build the argument list passed to the underlying `console` method.
 *
 * Exported for unit tests and for tooling that needs the same formatting rules without
 * emitting to the console. Does **not** check level enable flags.
 *
 * @param args — Original variadic arguments from a `logger.*` call.
 * @returns New array with ISO 8601 prefix applied per the formatting rules above.
 *
 * @example
 * ```ts
 * formatLoggerArgs(['loaded', { blades: 2 }]);
 * // ['[2026-09-21T03:14:00.000Z] loaded', { blades: 2 }]
 *
 * formatLoggerArgs([{ blades: 2 }]);
 * // ['[2026-09-21T03:14:00.000Z]', { blades: 2 }]
 * ```
 */
export function formatLoggerArgs(args: unknown[]): unknown[] {
  const timestamp = `[${getTimestamp()}]`;
  if (args.length === 0) {
    return [timestamp];
  }
  const [first, ...rest] = args;
  if (typeof first === 'string') {
    return [`${timestamp} ${first}`, ...rest];
  }
  return [timestamp, first, ...rest];
}

function emit(level: LogLevel, consoleFn: (...data: unknown[]) => void, args: unknown[]): void {
  if (!config[level]) {
    return;
  }
  consoleFn(...formatLoggerArgs(args));
}

/**
 * Logger interface — mirrors `console` with four methods.
 *
 * Each method accepts the same variadic arguments as its `console` counterpart.
 * Output is suppressed entirely when that level is disabled via {@link configureLogger}.
 */
export type Logger = {
  /** General informational output. Maps to `console.log`. */
  log: (...args: unknown[]) => void;
  /** Verbose diagnostic output. Maps to `console.debug`. */
  debug: (...args: unknown[]) => void;
  /** Non-fatal issues. Maps to `console.warn`. */
  warn: (...args: unknown[]) => void;
  /** Failures and exceptions. Maps to `console.error`. */
  error: (...args: unknown[]) => void;
};

/**
 * Shared logger instance for application-wide use.
 *
 * Import this singleton rather than calling `console` directly when you want timestamps
 * and level filtering:
 *
 * ```ts
 * import { logger } from '../logger';
 *
 * logger.debug('resolveLayerArgs', { sectionId, layerCount });
 * logger.warn('Unknown style id', styleName);
 * logger.error('Export failed', err);
 * ```
 *
 * Under the hood each method delegates to the matching `console.*` function after
 * {@link formatLoggerArgs} runs and the level enable check passes.
 */
export const logger: Logger = {
  log(...args: unknown[]) {
    emit('log', console.log, args);
  },
  debug(...args: unknown[]) {
    emit('debug', console.debug, args);
  },
  warn(...args: unknown[]) {
    emit('warn', console.warn, args);
  },
  error(...args: unknown[]) {
    emit('error', console.error, args);
  },
};
