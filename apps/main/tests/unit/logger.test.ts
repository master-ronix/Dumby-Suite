import { test, expect, vi, describe } from 'vitest';
import { Logger, createLogger } from '../../src/logging/logger.js';

function makeMockPino() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    level: 'info',
  };
}

describe('Logger (via mock pino)', () => {
  test('trace() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.trace('msg', { correlationId: 'c1' });
    expect(pino.trace).toHaveBeenCalledWith({ correlationId: 'c1' }, 'msg');
  });

  test('debug() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.debug('debug-msg');
    expect(pino.debug).toHaveBeenCalledWith({}, 'debug-msg');
  });

  test('info() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.info('info-msg', { guildId: 'g1' });
    expect(pino.info).toHaveBeenCalledWith({ guildId: 'g1' }, 'info-msg');
  });

  test('warn() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.warn('warn-msg');
    expect(pino.warn).toHaveBeenCalledWith({}, 'warn-msg');
  });

  test('error() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.error('error-msg', { userId: 'u1' });
    expect(pino.error).toHaveBeenCalledWith({ userId: 'u1' }, 'error-msg');
  });

  test('fatal() forwards to the pino instance', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.fatal('fatal-msg');
    expect(pino.fatal).toHaveBeenCalledWith({}, 'fatal-msg');
  });

  test('child() returns a new Logger wrapping pino.child()', () => {
    const childPino = makeMockPino();
    const pino = { ...makeMockPino(), child: vi.fn().mockReturnValue(childPino) };
    const logger = new Logger(pino as never);
    const childLogger = logger.child({ module: 'economy' });
    expect(pino.child).toHaveBeenCalledWith({ module: 'economy' });
    childLogger.info('from-child');
    expect(childPino.info).toHaveBeenCalledWith({}, 'from-child');
  });

  test('setLevel() updates the pino level property', () => {
    const pino = makeMockPino();
    const logger = new Logger(pino as never);
    logger.setLevel('debug');
    expect(pino.level).toBe('debug');
  });
});

describe('createLogger', () => {
  test('returns a Logger instance without throwing', () => {
    const logger = createLogger('silent');
    expect(logger).toBeInstanceOf(Logger);
  });

  test('created logger has info() method', () => {
    const logger = createLogger('silent');
    expect(() => logger.info('test-message')).not.toThrow();
  });

  test('child logger does not throw', () => {
    const logger = createLogger('silent');
    const child = logger.child({ module: 'test' });
    expect(() => child.debug('child-message')).not.toThrow();
  });
});
