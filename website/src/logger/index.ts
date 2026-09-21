/**
 * Logger — timestamped `console` wrapper with per-level enable flags and scoped contexts.
 *
 * ## Quick start
 *
 * ```ts
 * import { configureLogger, contextLogger, logger } from '../logger';
 *
 * configureLogger({ debug: false });
 *
 * logger.log('project loaded');
 *
 * function saveBlade() {
 *   const log = contextLogger('po-blade-card', 'saveBlade');
 *   log.entry();
 *   log.debug('payload', payload);
 *   log.exit();
 * }
 * ```
 *
 * ## Output shape
 *
 * Base logger: `[ISO8601] message`. Scoped logger adds `[objectName][functionName]` before
 * the message; the base logger then prepends the timestamp.
 *
 * Full guide: [README.md](./README.md)
 *
 * @module logger
 */
export {
  applyContextPrefix,
  applyTracePrefix,
  buildContextPrefix,
  configureContextLoggerFilter,
  contextLogger,
  getContextLoggerFilter,
  resetContextLoggerFilter,
} from './context-logger.js';
export type {
  ContextLogger,
  ContextLoggerFilter,
  ContextLoggerLabels,
} from './context-logger.js';
export {
  configureLogger,
  formatLoggerArgs,
  isLoggerEnabled,
  logger,
  resetLoggerConfig,
  resetLoggerTimestampProvider,
  setLoggerTimestampProvider,
} from './logger.js';
export type { LogLevel, Logger, LoggerConfig } from './logger.js';
