import { test, expect, vi } from 'vitest';
import {
  createUncaughtExceptionHandler,
  createUnhandledRejectionHandler,
  installFatalHandlers,
} from '../../src/shutdown/fatal-handler.js';

function makeLogger() {
  return { fatal: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
}

test('an uncaught exception is logged, notified, shut down and exits 1', async () => {
  const logger = makeLogger();
  const notify = vi.fn();
  const shutdown = vi.fn().mockResolvedValue(undefined);
  const exit = vi.fn();
  const handler = createUncaughtExceptionHandler({
    logger: logger as never,
    notify,
    shutdown,
    exit,
  });

  handler(new Error('boom'));

  expect(logger.fatal).toHaveBeenCalledWith(
    'uncaught-exception',
    expect.objectContaining({ error: expect.objectContaining({ message: 'boom' }) }),
  );
  expect(notify).toHaveBeenCalled();
  await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  expect(shutdown).toHaveBeenCalled();
});

test('a non-Error uncaught value is stringified', () => {
  const logger = makeLogger();
  const handler = createUncaughtExceptionHandler({ logger: logger as never, exit: vi.fn() });
  handler('stringy');
  expect(logger.fatal).toHaveBeenCalledWith(
    'uncaught-exception',
    expect.objectContaining({ error: 'stringy' }),
  );
});

test('an unhandled rejection is logged and notified without exiting', () => {
  const logger = makeLogger();
  const notify = vi.fn();
  const handler = createUnhandledRejectionHandler({ logger: logger as never, notify });
  handler('reason');
  expect(logger.fatal).toHaveBeenCalledWith(
    'unhandled-rejection',
    expect.objectContaining({ error: 'reason' }),
  );
  expect(notify).toHaveBeenCalled();
});

test('installFatalHandlers adds then removes its listeners', () => {
  const before = process.listenerCount('uncaughtException');
  const remove = installFatalHandlers({ logger: makeLogger() as never });
  expect(process.listenerCount('uncaughtException')).toBe(before + 1);
  remove();
  expect(process.listenerCount('uncaughtException')).toBe(before);
});
