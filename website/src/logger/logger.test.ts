/**
 * Unit tests for {@link module:logger/logger}.
 *
 * Covers timestamp formatting ({@link formatLoggerArgs}), level gating
 * ({@link configureLogger}), and delegation to the matching `console` method.
 *
 * @see README.md for formatting rules and usage examples
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  configureLogger,
  formatLoggerArgs,
  isLoggerEnabled,
  logger,
  resetLoggerConfig,
  resetLoggerTimestampProvider,
  setLoggerTimestampProvider,
} from './logger.js';

describe('formatLoggerArgs', () => {
  beforeEach(() => {
    setLoggerTimestampProvider(() => '2026-09-21T03:14:00.000Z');
  });

  afterEach(() => {
    resetLoggerTimestampProvider();
  });

  it('returns only a timestamp when no args are passed', () => {
    expect(formatLoggerArgs([])).toEqual(['[2026-09-21T03:14:00.000Z]']);
  });

  it('prepends timestamp to a string first argument', () => {
    expect(formatLoggerArgs(['hello', 42])).toEqual([
      '[2026-09-21T03:14:00.000Z] hello',
      42,
    ]);
  });

  it('prepends timestamp only when the first argument is not a string', () => {
    const payload = { id: 1 };
    expect(formatLoggerArgs([payload, 'extra'])).toEqual([
      '[2026-09-21T03:14:00.000Z]',
      payload,
      'extra',
    ]);
  });
});

describe('logger', () => {
  beforeEach(() => {
    resetLoggerConfig();
    setLoggerTimestampProvider(() => '2026-09-21T03:14:00.000Z');
  });

  afterEach(() => {
    resetLoggerConfig();
    resetLoggerTimestampProvider();
    vi.restoreAllMocks();
  });

  it('mirrors console methods with timestamped output', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.log('ready');
    logger.debug('trace', 1);
    logger.warn({ code: 'warn' });
    logger.error('failed', new Error('boom'));

    expect(logSpy).toHaveBeenCalledWith('[2026-09-21T03:14:00.000Z] ready');
    expect(debugSpy).toHaveBeenCalledWith('[2026-09-21T03:14:00.000Z] trace', 1);
    expect(warnSpy).toHaveBeenCalledWith('[2026-09-21T03:14:00.000Z]', { code: 'warn' });
    expect(errorSpy).toHaveBeenCalledWith(
      '[2026-09-21T03:14:00.000Z] failed',
      expect.any(Error),
    );
  });

  it('skips output when a level is disabled', () => {
    configureLogger({ debug: false, warn: false });
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug('hidden');
    logger.warn('hidden');
    logger.log('visible');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledOnce();
    expect(isLoggerEnabled('debug')).toBe(false);
    expect(isLoggerEnabled('log')).toBe(true);
  });
});
