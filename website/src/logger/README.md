# Logger

Timestamped wrapper around the browser **`console`** API for the ProffieOS config editor. Drop-in replacement for `console.log`, `console.debug`, `console.warn`, and `console.error` with:

1. **ISO 8601 prefix** on every line — `[2026-09-21T03:14:00.000Z]`
2. **Per-level toggles** — turn `log` / `debug` / `warn` / `error` on or off at runtime without changing call sites
3. **Scoped context loggers** — `[component][function]` prefixes, `entry` / `exit` tracing, and filters to narrow DevTools noise

The abstraction exists so the **underlying transport can change later** (remote logging to a backend, structured JSON, batching) without touching call sites. Today everything goes to `console`; tomorrow the same `logger.log(...)` can also POST to `/api/client-logs`.

Import from the barrel:

```ts
import { configureLogger, contextLogger, logger } from '../logger';
```

---

## Quick start

```ts
import { configureLogger, logger } from '../logger';

// Optional: tune verbosity once at app startup
configureLogger({
  log: true,
  debug: import.meta.env.DEV,
  warn: true,
  error: true,
});

logger.log('Config editor ready');
logger.debug('Initial wiring', wiringState);
logger.warn('Unused pin', pin);
logger.error('INI parse error', err);
```

DevTools output:

```
[2026-09-21T03:14:00.000Z] Config editor ready
[2026-09-21T03:14:00.042Z] Initial wiring { blades: [...] }
[2026-09-21T03:14:01.100Z] Unused pin 16
[2026-09-21T03:14:02.005Z] INI parse error Error: ...
```

---

## Scoped context logger

For function- or component-level tracing, create a **context logger** at the top of a scope:

```ts
import { contextLogger } from '../logger';

fooFunction() {
  const log = contextLogger('po-foo-component', 'fooFunction');
  log.entry();
  log.debug('processing', payload);
  log.warn('recoverable issue');
  log.exit('done', result);
}
```

DevTools output (base logger adds the timestamp; context logger adds labels):

```
[2026-09-21T03:14:00.000Z] [po-foo-component][fooFunction] → entry
[2026-09-21T03:14:00.012Z] [po-foo-component][fooFunction] processing { ... }
[2026-09-21T03:14:00.050Z] [po-foo-component][fooFunction] ← exit done { ... }
```

### Prefix rules

Both `objectName` and `functionName` are **optional**. Omitted segments are left out:

| Call | Context prefix |
|------|----------------|
| `contextLogger('po-blade-card', 'save')` | `[po-blade-card][save] ` |
| `contextLogger('po-blade-card')` | `[po-blade-card] ` |
| `contextLogger(undefined, 'save')` | `[save] ` |
| `contextLogger()` | *(none — same as base logger)* |

String messages merge into the prefix (then the base logger prepends the timestamp):

```ts
log.debug('ready');  // … [po-foo][bar] ready
log.debug({ id: 1 }); // … [po-foo][bar], { id: 1 }
```

### `entry` and `exit`

Trace helpers use **`debug`** level and prepend `→ entry` / `← exit`:

```ts
log.entry();              // → entry
log.entry('with args', x); // → entry with args, x
log.exit('result', r);    // ← exit result, r
```

Use at function boundaries while debugging; filter them out in production with `configureLogger({ debug: false })` or narrow with context filters below.

### Skip noisy hot paths

Do **not** add `entry`/`exit` on methods that run every frame or every Lit update — they flood DevTools and slow tests. Skip logging entirely on:

| Skip | Why |
|------|-----|
| `render`, `createRenderRoot`, `willUpdate`, `updated` | Every re-render |
| `render*` helpers called only from `render` | Same cadence as render |
| Pure catalog/lookup utils called from render (e.g. `pin-picker-utils`) | Same cadence as render |
| Effector `store.watch` callbacks | Every store tick |
| rAF layout/draw loops (`layoutAndDraw`, `onLayoutFrame`, …) | Every animation frame |

**Do** log user handlers (`on*`), mutations (`patch*`, `emit*`), lifecycle connect/disconnect, and branch `debug` where a decision matters.

### Narrowing output (`configureContextLoggerFilter`)

When many components log at once, restrict which contexts may emit:

```ts
import { configureContextLoggerFilter } from '../logger';

// Only this component (any function)
configureContextLoggerFilter({ objectNames: ['po-blade-card'] });

// Only this function name (any component)
configureContextLoggerFilter({ functionNames: ['saveBlade'] });

// Intersection — both must match
configureContextLoggerFilter({
  objectNames: ['po-blade-card'],
  functionNames: ['saveBlade'],
});

// Clear filters
resetContextLoggerFilter();
```

Empty or omitted `objectNames` / `functionNames` arrays mean **no restriction** on that axis. Filters apply only to **scoped** loggers (`contextLogger`); the root `logger` is unaffected.

### Layering (how prefixes stack)

```
call site args
  → context prefix [object][function] + message   (context-logger.ts)
  → timestamp prefix [ISO8601] + message          (logger.ts)
  → console.log / debug / warn / error              (today)
  → (future) remote sink, batching, redaction       (same seam)
```

---

## Why not use `console` directly?

| Concern | Raw `console` | Logger |
|---------|---------------|--------|
| Correlating logs with user reports | Manual timestamps | Automatic ISO 8601 on every line |
| Noisy debug in production | `if (DEV) console.debug(...)` at every site | One `configureLogger({ debug: false })` |
| Consistent format across modules | Ad-hoc prefixes | Single formatting rules |
| Swapping transport later | Every call site uses `console` | One implementation change behind `logger` / `contextLogger` |
| Finding logs for one component | Search ad-hoc strings | Filter `[po-blade-card]` or `configureContextLoggerFilter` |

Today the logger is a thin pass-through to `console` with formatting and gating. The API is shaped so a future hosted build can add backend shipping without changing component code.

---

## Timestamp formatting rules

The logger builds a **new** argument array for each `console` call. Your original values are never mutated.

### First argument is a string

The message is merged into the prefix:

```ts
logger.log('blade saved');
// → console.log('[2026-09-21T03:14:00.000Z] blade saved')

logger.log('export', filename, bytes);
// → console.log('[2026-09-21T03:14:00.000Z] export', filename, bytes)
```

### First argument is not a string

The timestamp is emitted as its own argument; the original values follow unchanged:

```ts
logger.warn({ pin: 16, usedBy: 'blade-1' });
// → console.warn('[2026-09-21T03:14:00.000Z]', { pin: 16, usedBy: 'blade-1' })

logger.log(42, 'count');
// → console.log('[2026-09-21T03:14:00.000Z]', 42, 'count')

logger.error(err);
// → console.error('[2026-09-21T03:14:00.000Z]', err)
```

This keeps DevTools object expansion identical to calling `console` directly — only the leading timestamp token is added.

### No arguments

```ts
logger.log();
// → console.log('[2026-09-21T03:14:00.000Z]')
```

### Summary table

| Call | First arg type | Console receives |
|------|----------------|------------------|
| `logger.log('msg')` | string | `'[time] msg'` |
| `logger.log('msg', obj)` | string | `'[time] msg', obj` |
| `logger.log(obj)` | object | `'[time]', obj` |
| `logger.log(n, 'extra')` | number | `'[time]', n, 'extra'` |
| `logger.log()` | — | `'[time]'` |

**Note:** `typeof null === 'object'` in JavaScript. A `null` first argument is treated as non-string and produces `'[time]', null`.

---

## Log levels

Four levels mirror the standard console methods:

| Level | Method | Maps to | Typical use |
|-------|--------|---------|-------------|
| `log` | `logger.log(...)` | `console.log` | General information, lifecycle events |
| `debug` | `logger.debug(...)` | `console.debug` | Verbose diagnostics, state dumps |
| `warn` | `logger.warn(...)` | `console.warn` | Recoverable issues, deprecations |
| `error` | `logger.error(...)` | `console.error` | Failures, caught exceptions |

All levels default to **enabled** (`true`).

---

## Configuration API

### `configureLogger(settings)`

Merge partial on/off flags. Omitted levels keep their current value.

```ts
configureLogger({ debug: false });

configureLogger({
  log: import.meta.env.DEV,
  debug: false,
  warn: true,
  error: true,
});
```

When a level is disabled, calls to that method return immediately — **no** `console` invocation, **no** thrown error, **no** noop placeholder.

### `isLoggerEnabled(level)`

Query the current state:

```ts
configureLogger({ debug: false });
isLoggerEnabled('debug'); // false
isLoggerEnabled('error'); // true
```

### `resetLoggerConfig()`

Re-enable all four levels. Use in test `afterEach` or to undo temporary debug silencing.

---

## Recommended usage patterns

### App bootstrap (`main.ts`)

Configure once before rendering:

```ts
import { configureLogger, logger } from './logger';

configureLogger({
  debug: import.meta.env.DEV,
  log: import.meta.env.DEV,
});

logger.log('ProffieOS config editor starting');
```

### Component diagnostics

Prefer `contextLogger` inside functions so labels stay consistent:

```ts
import { contextLogger } from '../../logger';

async function runWebAwesomeDiscover(root: DiscoverRoot) {
  const log = contextLogger('po-element', 'runWebAwesomeDiscover');
  log.entry();
  try {
    await discover(root);
    log.exit();
  } catch (error) {
    log.warn('Web Awesome discover failed:', error);
    log.exit('failed', error);
  }
}
```

### Temporary deep debugging

```ts
import { configureLogger, logger } from '../logger';

configureLogger({ debug: true });
logger.debug('styleSections', getStyleSectionsSnapshot());
// ...
configureLogger({ debug: false });
```

---

## Testing

Tests live in `logger.test.ts`. The module exports test helpers so assertions stay deterministic:

```ts
import {
  configureLogger,
  formatLoggerArgs,
  logger,
  resetLoggerConfig,
  resetLoggerTimestampProvider,
  setLoggerTimestampProvider,
} from './logger.js';

beforeEach(() => {
  resetLoggerConfig();
  setLoggerTimestampProvider(() => '2026-09-21T03:14:00.000Z');
});

afterEach(() => {
  resetLoggerConfig();
  resetLoggerTimestampProvider();
  vi.restoreAllMocks();
});

it('formats a string message', () => {
  expect(formatLoggerArgs(['hello'])).toEqual(['[2026-09-21T03:14:00.000Z] hello']);
});

it('respects disabled levels', () => {
  const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  configureLogger({ debug: false });
  logger.debug('hidden');
  expect(spy).not.toHaveBeenCalled();
});
```

Run:

```bash
npm test -- src/logger/logger.test.ts
```

---

## API reference

### Base logger

| Export | Type | Description |
|--------|------|-------------|
| `logger` | `Logger` | Singleton with `log`, `debug`, `warn`, `error` |
| `configureLogger` | `(Partial<LoggerConfig>) => void` | Enable/disable levels |
| `resetLoggerConfig` | `() => void` | All levels → `true` |
| `isLoggerEnabled` | `(LogLevel) => boolean` | Query one level |
| `formatLoggerArgs` | `(unknown[]) => unknown[]` | Apply timestamp rules without emitting |
| `setLoggerTimestampProvider` | `(() => string) => void` | Inject fixed clock (tests) |
| `resetLoggerTimestampProvider` | `() => void` | Restore `new Date().toISOString()` |
| `LogLevel` | type | `'log' \| 'debug' \| 'warn' \| 'error'` |
| `LoggerConfig` | type | `Record<LogLevel, boolean>` |
| `Logger` | type | Interface for the singleton |

### Context logger

| Export | Type | Description |
|--------|------|-------------|
| `contextLogger` | `(objectName?, functionName?) => ContextLogger` | Scoped logger factory |
| `configureContextLoggerFilter` | `(ContextLoggerFilter) => void` | Allow-list objects/functions |
| `resetContextLoggerFilter` | `() => void` | Clear allow-lists |
| `getContextLoggerFilter` | `() => ContextLoggerFilter` | Read active filter |
| `buildContextPrefix` | `(objectName?, functionName?) => string` | Bracket prefix helper |
| `applyContextPrefix` | `(prefix, args) => unknown[]` | Merge prefix into args |
| `ContextLogger` | type | `Logger` + `entry` / `exit` + `context` |
| `ContextLoggerFilter` | type | `{ objectNames?, functionNames? }` |

---

## Design notes

- **Singleton config** — one shared enable map for the whole app. Multiple isolated loggers are not supported; keep configuration at bootstrap.
- **No log levels beyond four** — matches browser `console`; no `info` or `trace` aliases.
- **Synchronous only** — each call goes straight to `console`; no async queue.
- **Browser-only** — relies on `console` and `Date`. Safe in Vitest/jsdom tests with spies.
- **Not a replacement for error reporting** — use this for developer-facing DevTools output only.

---

## File layout

```
logger/
  README.md              ← this guide
  index.ts               ← public barrel export
  logger.ts              ← base logger (timestamp + level toggles)
  logger.test.ts
  context-logger.ts      ← scoped [object][function] + entry/exit + filters
  context-logger.test.ts
```
