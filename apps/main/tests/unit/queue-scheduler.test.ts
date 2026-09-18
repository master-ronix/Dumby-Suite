import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler, type ScheduledTask } from '../../src/queue/scheduler.js';
import type { LockStore } from '../../src/cache/redis-lock-store.js';
import type { BaseTask } from '../../src/queue/base-processor.js';

function makeLockStore(): {
  store: LockStore;
  setNX: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  const setNX = vi.fn(async (): Promise<boolean> => true);
  const release = vi.fn(async (): Promise<void> => undefined);
  return {
    store: { setNX, release } as unknown as LockStore,
    setNX,
    release,
  };
}

function makeTask(name: string, cron: string): BaseTask {
  return {
    name,
    cron,
    execute: vi.fn(async () => undefined),
  } as unknown as BaseTask & { execute: ReturnType<typeof vi.fn> };
}

describe('Scheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('registers tasks and derives intervalMs from cron', () => {
    const { store } = makeLockStore();
    const scheduler = new Scheduler({
      logger: { info: vi.fn(), error: vi.fn() } as never,
      lockStore: store,
    });
    scheduler.register(makeTask('task-a', '*/1'));
    scheduler.register(makeTask('task-b', '*/15'));
    const registered = (scheduler as unknown as { tasks: Map<string, ScheduledTask> }).tasks;
    expect(registered.get('task-a')?.intervalMs).toBe(60_000);
    expect(registered.get('task-b')?.intervalMs).toBe(900_000);
  });

  test('tick executes the task under the lock and releases it', async () => {
    vi.useFakeTimers();
    const { store, setNX, release } = makeLockStore();
    const logger = { info: vi.fn(), error: vi.fn() };
    const scheduler = new Scheduler({ logger: logger as never, lockStore: store });
    const task = makeTask('tick', '*/1');
    scheduler.register(task);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(setNX).toHaveBeenCalledTimes(1);
    expect(task.execute).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);

    scheduler.stop();
    vi.useRealTimers();
  });

  test('skips the tick when the lock is held by someone else', async () => {
    vi.useFakeTimers();
    const { store, release } = makeLockStore();
    store.setNX = vi.fn(async () => false) as typeof store.setNX;
    const task = makeTask('skipped', '*/1');
    const scheduler = new Scheduler({
      logger: { info: vi.fn(), error: vi.fn() } as never,
      lockStore: store,
      now: () => 0,
    });
    scheduler.register(task);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(task.execute).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();

    scheduler.stop();
    vi.useRealTimers();
  });

  test('logs a failure when a task throws', async () => {
    vi.useFakeTimers();
    const { store } = makeLockStore();
    const error = vi.fn();
    const scheduler = new Scheduler({
      logger: { info: vi.fn(), error } as never,
      lockStore: store,
      now: () => 0,
    });
    const task = makeTask('boom', '*/1');
    (task.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('task failed'));
    scheduler.register(task);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(error).toHaveBeenCalledWith(
      'scheduler-task-failed',
      expect.objectContaining({ task: 'boom' }),
    );

    scheduler.stop();
    vi.useRealTimers();
  });

  test('stop clears all timers', async () => {
    vi.useFakeTimers();
    const { store } = makeLockStore();
    const scheduler = new Scheduler({
      logger: { info: vi.fn(), error: vi.fn() } as never,
      lockStore: store,
    });
    scheduler.register(makeTask('one', '*/1'));
    scheduler.register(makeTask('two', '*/1'));
    scheduler.start();
    scheduler.stop();

    const timers = (scheduler as unknown as { timers: Map<string, unknown> }).timers;
    expect(timers.size).toBe(0);

    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
});
