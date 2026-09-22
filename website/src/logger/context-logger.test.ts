/**
 * Unit tests for scoped {@link contextLogger}.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyContextPrefix,
  applyTracePrefix,
  buildContextPrefix,
  configureContextLoggerFilter,
  contextLogger,
  getContextLoggerFilter,
  resetContextLoggerFilter,
} from './context-logger.js';
import { resetLoggerConfig, setLoggerTimestampProvider } from './logger.js';

describe('buildContextPrefix', () => {
  it('builds both segments when provided', () => {
    expect(buildContextPrefix('po-foo', 'bar')).toBe('[po-foo][bar] ');
  });

  it('omits missing segments', () => {
    expect(buildContextPrefix('po-foo')).toBe('[po-foo] ');
    expect(buildContextPrefix(undefined, 'bar')).toBe('[bar] ');
    expect(buildContextPrefix()).toBe('');
  });
});

describe('applyContextPrefix', () => {
  it('returns args unchanged when prefix is empty', () => {
    expect(applyContextPrefix('', ['ready'])).toEqual(['ready']);
  });

  it('uses trimmed prefix alone when args are empty', () => {
    expect(applyContextPrefix('[po-foo] ', [])).toEqual(['[po-foo]']);
  });

  it('merges prefix with a string first argument', () => {
    expect(applyContextPrefix('[po-foo][bar] ', ['ready', 1])).toEqual(['[po-foo][bar] ready', 1]);
  });

  it('keeps non-string first arguments separate', () => {
    const payload = { id: 1 };
    expect(applyContextPrefix('[po-foo] ', [payload])).toEqual(['[po-foo]', payload]);
  });
});

describe('applyTracePrefix', () => {
  it('adds entry and exit markers', () => {
    expect(applyTracePrefix('entry', '[a][b] ', [])).toEqual(['[a][b] → entry']);
    expect(applyTracePrefix('exit', '[a] ', ['done'])).toEqual(['[a] ← exit done']);
  });
});

describe('contextLogger', () => {
  beforeEach(() => {
    resetLoggerConfig();
    resetContextLoggerFilter();
    setLoggerTimestampProvider(() => '2026-09-21T03:14:00.000Z');
  });

  afterEach(() => {
    resetContextLoggerFilter();
    vi.restoreAllMocks();
  });

  it('delegates to base logger with context and timestamp prefixes', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const log = contextLogger('po-foo-component', 'fooFunction');

    log.debug('state', { n: 1 });
    log.entry();
    log.exit('ok');

    expect(debugSpy).toHaveBeenNthCalledWith(
      1,
      '[2026-09-21T03:14:00.000Z] [po-foo-component][fooFunction] state',
      { n: 1 },
    );
    expect(debugSpy).toHaveBeenNthCalledWith(
      2,
      '[2026-09-21T03:14:00.000Z] [po-foo-component][fooFunction] → entry',
    );
    expect(debugSpy).toHaveBeenNthCalledWith(
      3,
      '[2026-09-21T03:14:00.000Z] [po-foo-component][fooFunction] ← exit ok',
    );
  });

  it('respects object and function filters', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    configureContextLoggerFilter({ objectNames: ['po-foo-component'], functionNames: ['allowed'] });

    contextLogger('po-foo-component', 'allowed').debug('visible');
    contextLogger('po-other', 'allowed').debug('hidden object');
    contextLogger('po-foo-component', 'blocked').debug('hidden function');

    expect(debugSpy).toHaveBeenCalledOnce();
    expect(debugSpy).toHaveBeenCalledWith(
      '[2026-09-21T03:14:00.000Z] [po-foo-component][allowed] visible',
    );
  });

  it('passes through when no context labels are provided', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    contextLogger().warn('plain');
    expect(warnSpy).toHaveBeenCalledWith('[2026-09-21T03:14:00.000Z] plain');
  });

  it('blocks contexts missing a filtered function name', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    configureContextLoggerFilter({ functionNames: ['saveBlade'] });
    contextLogger('po-blade-card').debug('hidden');
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('silences filtered entry and exit traces', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    configureContextLoggerFilter({ objectNames: ['other-component'] });
    const log = contextLogger('po-foo-component', 'fooFunction');
    log.entry();
    log.exit();
    expect(debugSpy).not.toHaveBeenCalled();
  });
});

describe('configureContextLoggerFilter', () => {
  afterEach(() => {
    resetContextLoggerFilter();
  });

  it('stores and resets filter settings', () => {
    configureContextLoggerFilter({
      objectNames: ['po-a'],
      functionNames: ['save'],
    });
    expect(getContextLoggerFilter()).toEqual({
      objectNames: ['po-a'],
      functionNames: ['save'],
    });
    resetContextLoggerFilter();
    expect(getContextLoggerFilter()).toEqual({});
  });
});
