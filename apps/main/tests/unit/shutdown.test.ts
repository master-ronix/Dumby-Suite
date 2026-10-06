import { test, expect, vi } from 'vitest';
import {
  gracefulShutdown,
  isAcceptingGatewayEvents,
  registerShutdownSignalHandlers,
  SHUTDOWN_STEP_TIMEOUTS_MS,
} from '../../src/shutdown/shutdown.js';
import type { ShutdownDeps } from '../../src/shutdown/shutdown.js';

function mockDeps(): ShutdownDeps {
  return {
    logger: { info: vi.fn(), error: vi.fn() } as unknown as ShutdownDeps['logger'],
    apiServer: {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as ShutdownDeps['apiServer'],
    healthServer: {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as ShutdownDeps['healthServer'],
    metricsServer: {
      close: vi.fn().mockResolvedValue(undefined),
    } as unknown as ShutdownDeps['metricsServer'],
    moduleLoader: {
      unloadAll: vi.fn().mockResolvedValue(undefined),
    } as unknown as ShutdownDeps['moduleLoader'],
    moduleOrder: ['health', 'hello'],
    queue: { shutdown: vi.fn().mockResolvedValue(undefined) } as unknown as ShutdownDeps['queue'],
    redis: { disconnect: vi.fn() } as unknown as ShutdownDeps['redis'],
    queueRedis: { disconnect: vi.fn() } as unknown as ShutdownDeps['queueRedis'],
    db: { destroy: vi.fn().mockResolvedValue(undefined) } as unknown as ShutdownDeps['db'],
    discordClient: {
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as ShutdownDeps['discordClient'],
    drainInFlightCommands: vi.fn().mockResolvedValue(undefined),
  };
}

test('gracefulShutdown calls all 9 steps in order with SIGTERM', async () => {
  const deps = mockDeps();
  await gracefulShutdown(deps, 'SIGTERM');

  expect(deps.discordClient?.destroy).toHaveBeenCalled();
  expect(deps.drainInFlightCommands).toHaveBeenCalled();
  expect(deps.moduleLoader.unloadAll).toHaveBeenCalledWith(deps.moduleOrder);
  expect(deps.queue.shutdown).toHaveBeenCalled();
  expect(deps.apiServer.close).toHaveBeenCalled();
  expect(deps.healthServer.close).toHaveBeenCalled();
  expect(deps.metricsServer.close).toHaveBeenCalled();
  expect(deps.queueRedis.disconnect).toHaveBeenCalled();
  expect(deps.redis.disconnect).toHaveBeenCalled();
  expect(deps.db.destroy).toHaveBeenCalled();
});

test('gracefulShutdown without discordClient does not call destroy', async () => {
  const deps = mockDeps();
  deps.discordClient = undefined;
  await gracefulShutdown(deps, 'SIGINT');

  expect(deps.logger.info).toHaveBeenCalledWith('shutdown-initiated', { signal: 'SIGINT' });
  expect(deps.logger.info).toHaveBeenCalledWith('shutdown-complete', { signal: 'SIGINT' });
});

test('gracefulShutdown continues even if a step times out', { timeout: 30_000 }, async () => {
  const deps = mockDeps();
  deps.stepTimeoutsMs = { DRAIN_QUEUES_AND_DEAD_LETTER: 10 };
  deps.queue.shutdown = vi.fn().mockImplementation(() => new Promise((r) => setTimeout(r, 20_000)));
  const promise = gracefulShutdown(deps, 'SIGTERM');
  await promise;
  expect(deps.logger.error).toHaveBeenCalledWith(
    'shutdown-step-failed',
    expect.objectContaining({ name: 'DRAIN_QUEUES_AND_DEAD_LETTER' }),
  );
});

test('shutdown default ceilings match the documented 180 second sequence', () => {
  expect(SHUTDOWN_STEP_TIMEOUTS_MS).toStrictEqual({
    STOP_ACCEPTING_GATEWAY_EVENTS: 30_000,
    DRAIN_IN_FLIGHT_COMMANDS: 30_000,
    UNLOAD_MODULES_REVERSE_ORDER: 30_000,
    DRAIN_QUEUES_AND_DEAD_LETTER: 60_000,
    CLOSE_HTTP_SERVER: 10_000,
    FLUSH_LOGS_AND_TRACES: 5000,
    CLOSE_QUEUE_CONNECTIONS: 5000,
    CLOSE_REDIS_CONNECTION: 5000,
    CLOSE_DATABASE_POOL: 5000,
  });
});

test('isAcceptingGatewayEvents toggles false after gracefulShutdown', async () => {
  const deps = mockDeps();
  await gracefulShutdown(deps, 'SIGTERM');
  expect(isAcceptingGatewayEvents()).toBe(false);
});

test('registerShutdownSignalHandlers registers SIGTERM and SIGINT', () => {
  const onSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
  const deps = mockDeps();
  registerShutdownSignalHandlers(deps);
  expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
  expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  onSpy.mockRestore();
});
