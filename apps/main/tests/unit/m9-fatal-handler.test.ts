import { test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createUncaughtExceptionHandler,
  createUnhandledRejectionHandler,
  FATAL_SHUTDOWN_CEILING_MS,
} from '../../src/shutdown/fatal-handler.js';

function makeHooks(overrides: Partial<Parameters<typeof createUncaughtExceptionHandler>[0]> = {}) {
  return {
    logger: { fatal: vi.fn() },
    shutdown: vi.fn(async () => undefined),
    exit: vi.fn(),
    notify: vi.fn(),
    ...overrides,
  };
}

test('uncaughtException handler logs fatal with a correlation id and exits via the injected exit', async () => {
  const hooks = makeHooks();
  const handler = createUncaughtExceptionHandler(hooks as never);
  handler(new Error('boom'));

  expect(hooks.logger.fatal).toHaveBeenCalledTimes(1);
  const [event, context] = hooks.logger.fatal.mock.calls[0] as [
    string,
    { correlationId: string; error: unknown },
  ];
  expect(event).toBe('uncaught-exception');
  expect(context.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  expect(context.error).toStrictEqual({ message: 'boom', stack: expect.any(String) });

  await vi.waitFor(() => expect(hooks.exit).toHaveBeenCalledWith(1));
  expect(hooks.shutdown).toHaveBeenCalledTimes(1);
});

test('handler never exits before the shutdown completes (allowed-after semantics)', async () => {
  let releaseShutdown: (() => void) | undefined;
  const hooks = makeHooks({
    shutdown: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          releaseShutdown = resolve;
        }),
    ),
  });
  const handler = createUncaughtExceptionHandler(hooks as never);
  handler(new Error('boom'));

  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(hooks.exit).not.toHaveBeenCalled();

  releaseShutdown?.();
  await vi.waitFor(() => expect(hooks.exit).toHaveBeenCalledWith(1));
});

test('a shutdown that hangs past the 15s ceiling still forces exit 1', async () => {
  vi.useFakeTimers();
  try {
    const hooks = makeHooks({
      shutdown: vi.fn(() => new Promise<void>(() => undefined)),
    });
    const handler = createUncaughtExceptionHandler(hooks as never);
    handler(new Error('boom'));

    expect(hooks.exit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FATAL_SHUTDOWN_CEILING_MS + 1);
    await vi.waitFor(() => expect(hooks.exit).toHaveBeenCalledWith(1));
  } finally {
    vi.useRealTimers();
  }
  expect(FATAL_SHUTDOWN_CEILING_MS).toBe(15_000);
});

test('unhandledRejection handler logs fatal with a correlation id but does not exit', async () => {
  const hooks = makeHooks();
  const handler = createUnhandledRejectionHandler(hooks as never);
  handler(new Error('misfire'));

  expect(hooks.logger.fatal).toHaveBeenCalledTimes(1);
  const [event] = hooks.logger.fatal.mock.calls[0] as [string];
  expect(event).toBe('unhandled-rejection');
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(hooks.exit).not.toHaveBeenCalled();
});

test('both handlers notify the system.fatalError bus and never throw while reporting', () => {
  const hooks = makeHooks({
    notify: vi.fn(() => {
      throw new Error('bus is down');
    }),
  });
  const handler = createUncaughtExceptionHandler(hooks as never);
  expect(() => handler(new Error('boom'))).not.toThrow();
  expect(hooks.notify).toHaveBeenCalledTimes(1);
});

test('bootstrap Stage 01 installs the fatal handlers instead of console.error (source gate)', () => {
  const src = readFileSync(new URL('../../src/bootstrap/bootstrap.ts', import.meta.url), 'utf8');
  expect(src).toContain('installFatalHandlers');
  expect(src).not.toContain('console.error');
  expect(src).not.toContain("process.on('uncaughtException'");
  expect(src).toContain('fatalHooks.shutdown');
});
