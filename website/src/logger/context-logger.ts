/**
 * Scoped logger that prepends `[objectName][functionName]` before delegating to {@link logger}.
 *
 * Use at the top of a function to get searchable, filterable context in DevTools (and in any
 * future remote-log sink wired into the base logger):
 *
 * ```ts
 * function saveBlade() {
 *   const log = contextLogger('po-blade-card', 'saveBlade');
 *   log.entry();
 *   log.debug('payload', payload);
 *   log.exit('ok');
 * }
 * // → [2026-09-21T03:14:00.000Z] [po-blade-card][saveBlade] → entry
 * ```
 *
 * Both `objectName` and `functionName` are optional. Omitted labels are left out of the prefix.
 * Use {@link configureContextLoggerFilter} to narrow output to specific components or functions.
 *
 * @module logger/context-logger
 * @see {@link contextLogger}
 * @see {@link configureContextLoggerFilter}
 */

import { logger, type LogLevel, type Logger } from './logger.js';

/** Labels attached to a scoped logger instance. */
export type ContextLoggerLabels = {
  objectName?: string;
  functionName?: string;
};

/**
 * Restrict which scoped contexts may emit logs.
 *
 * - When `objectNames` is non-empty, only matching object names are allowed.
 * - When `functionNames` is non-empty, only matching function names are allowed.
 * - Empty or omitted arrays mean “no restriction” on that axis.
 */
export type ContextLoggerFilter = {
  objectNames?: readonly string[];
  functionNames?: readonly string[];
};

/** Scoped logger — base {@link Logger} methods plus `entry` / `exit` trace helpers. */
export type ContextLogger = Logger & {
  /** Function-entry trace (uses `debug` level). */
  entry: (...args: unknown[]) => void;
  /** Function-exit trace (uses `debug` level). */
  exit: (...args: unknown[]) => void;
  /** Resolved labels for this instance (remote logging, filter UIs). */
  readonly context: Readonly<ContextLoggerLabels>;
};

let contextFilter: ContextLoggerFilter = {};

/**
 * Narrow scoped logging to specific components and/or functions.
 *
 * @example
 * ```ts
 * // Only po-blade-card, any function
 * configureContextLoggerFilter({ objectNames: ['po-blade-card'] });
 *
 * // Only saveBlade across all components
 * configureContextLoggerFilter({ functionNames: ['saveBlade'] });
 *
 * // Intersection: one component + one function
 * configureContextLoggerFilter({
 *   objectNames: ['po-blade-card'],
 *   functionNames: ['saveBlade'],
 * });
 * ```
 */
export function configureContextLoggerFilter(filter: ContextLoggerFilter): void {
  contextFilter = {
    objectNames: filter.objectNames ? [...filter.objectNames] : undefined,
    functionNames: filter.functionNames ? [...filter.functionNames] : undefined,
  };
}

/** Remove all scoped-log filters (allow every context). */
export function resetContextLoggerFilter(): void {
  contextFilter = {};
}

/** Read the active scoped-log filter (shallow copy). */
export function getContextLoggerFilter(): ContextLoggerFilter {
  return {
    objectNames: contextFilter.objectNames ? [...contextFilter.objectNames] : undefined,
    functionNames: contextFilter.functionNames ? [...contextFilter.functionNames] : undefined,
  };
}

/**
 * Build the bracket prefix for a scoped context.
 *
 * @returns `"[object][function] "` with only provided segments, or `""` when both are omitted.
 *
 * @example
 * ```ts
 * buildContextPrefix('po-foo', 'bar'); // '[po-foo][bar] '
 * buildContextPrefix('po-foo');        // '[po-foo] '
 * buildContextPrefix(undefined, 'bar'); // '[bar] '
 * buildContextPrefix();                // ''
 * ```
 */
export function buildContextPrefix(objectName?: string, functionName?: string): string {
  let prefix = '';
  if (objectName) {
    prefix += `[${objectName}]`;
  }
  if (functionName) {
    prefix += `[${functionName}]`;
  }
  if (prefix) {
    prefix += ' ';
  }
  return prefix;
}

/**
 * Prepend a scoped context prefix to logger arguments (same string/object rules as {@link logger}).
 *
 * @param prefix — From {@link buildContextPrefix}; may be empty.
 * @param args — Original call arguments.
 */
export function applyContextPrefix(prefix: string, args: unknown[]): unknown[] {
  if (!prefix) {
    return args;
  }
  const trimmedPrefix = prefix.trimEnd();
  if (args.length === 0) {
    return [trimmedPrefix];
  }
  const [first, ...rest] = args;
  if (typeof first === 'string') {
    return [`${prefix}${first}`, ...rest];
  }
  return [trimmedPrefix, first, ...rest];
}

/** Prepend a trace marker (`→ entry` / `← exit`) before applying the context prefix. */
export function applyTracePrefix(
  kind: 'entry' | 'exit',
  contextPrefix: string,
  args: unknown[],
): unknown[] {
  const marker = kind === 'entry' ? '→ entry' : '← exit';
  if (args.length === 0) {
    return applyContextPrefix(contextPrefix, [marker]);
  }
  const [first, ...rest] = args;
  if (typeof first === 'string') {
    return applyContextPrefix(contextPrefix, [`${marker} ${first}`, ...rest]);
  }
  return applyContextPrefix(contextPrefix, [marker, first, ...rest]);
}

function isContextAllowed(labels: ContextLoggerLabels): boolean {
  const { objectNames, functionNames } = contextFilter;
  if (objectNames && objectNames.length > 0) {
    if (!labels.objectName || !objectNames.includes(labels.objectName)) {
      return false;
    }
  }
  if (functionNames && functionNames.length > 0) {
    if (!labels.functionName || !functionNames.includes(labels.functionName)) {
      return false;
    }
  }
  return true;
}

function createContextEmitter(
  labels: ContextLoggerLabels,
  contextPrefix: string,
  level: LogLevel,
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    if (!isContextAllowed(labels)) {
      return;
    }
    logger[level](...applyContextPrefix(contextPrefix, args));
  };
}

/**
 * Create a scoped logger for one component and/or function.
 *
 * @param objectName — Component or module id (e.g. `'po-blade-card'`). Omitted → no object segment.
 * @param functionName — Function or method name. Omitted → no function segment.
 *
 * @example
 * ```ts
 * fooFunction() {
 *   const log = contextLogger('po-foo-component', 'fooFunction');
 *   log.entry();
 *   log.debug('state', state);
 *   log.exit('done');
 * }
 * ```
 */
export function contextLogger(objectName?: string, functionName?: string): ContextLogger {
  const labels: ContextLoggerLabels = { objectName, functionName };
  const contextPrefix = buildContextPrefix(objectName, functionName);

  const emitTrace = (kind: 'entry' | 'exit', args: unknown[]) => {
    if (!isContextAllowed(labels)) {
      return;
    }
    logger.debug(...applyTracePrefix(kind, contextPrefix, args));
  };

  return {
    context: labels,
    log: createContextEmitter(labels, contextPrefix, 'log'),
    debug: createContextEmitter(labels, contextPrefix, 'debug'),
    warn: createContextEmitter(labels, contextPrefix, 'warn'),
    error: createContextEmitter(labels, contextPrefix, 'error'),
    entry(...args: unknown[]) {
      emitTrace('entry', args);
    },
    exit(...args: unknown[]) {
      emitTrace('exit', args);
    },
  };
}
