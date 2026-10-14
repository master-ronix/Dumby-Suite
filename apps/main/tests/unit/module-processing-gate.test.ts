import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { QueueManager } from '../../src/queue/queue-manager.js';
import { Scheduler } from '../../src/queue/scheduler.js';
import type { BaseTask } from '../../src/queue/base-processor.js';
import type { LockStore } from '../../src/cache/redis-lock-store.js';

/**
 * UR-20261012-069 — "a disabled module's handlers stop firing" (§13.2) must hold for QUEUED WORK and
 * for the SCHEDULE, not only for commands and gateway events. A per-guild disable is a state-table
 * write, not an unload (§13.7), so the queue stays registered and the enforcement is here, at
 * execution. These tests pin that: a job for a guild that disabled the module does not run, and a
 * cron task stops when no guild wants the module.
 */

const capturedProcessors: Array<(job: unknown, token?: unknown) => Promise<unknown>> = [];

vi.mock('bullmq', () => {
  class MockQueue {
    add = vi.fn(async () => ({ id: 'job-1' }));
    pause = vi.fn(async () => undefined);
    resume = vi.fn(async () => undefined);
    getFailed = vi.fn(async () => []);
    getJob = vi.fn(async () => null);
    getJobCounts = vi.fn(async () => ({ waiting: 0, active: 0, delayed: 0 }));
    close = vi.fn(async () => undefined);
    constructor(readonly name: string) {}
  }
  class MockWorker {
    on = vi.fn();
    concurrency = 1;
    close = vi.fn(async () => undefined);
    constructor(_name: string, processor: never, opts: { concurrency: number }) {
      capturedProcessors.push(processor as never);
      this.concurrency = opts.concurrency;
    }
  }
  class MockQueueEvents {
    close = vi.fn(async () => undefined);
  }
  return { Queue: MockQueue, Worker: MockWorker, QueueEvents: MockQueueEvents };
});

const logger = () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
});

function makeManager(isModuleEnabled?: (moduleId: string, guildId: string) => Promise<boolean>) {
  return new QueueManager({
    connection: {} as never,
    logger: logger() as never,
    defaultConcurrency: 2,
    ...(isModuleEnabled !== undefined ? { isModuleEnabled } : {}),
  });
}

describe('a disabled module’s queued work does not run (UR-20261012-069)', () => {
  beforeEach(() => {
    capturedProcessors.length = 0;
    vi.clearAllMocks();
  });

  test('a job for a guild that disabled the module is SKIPPED', async () => {
    const ran = vi.fn(async () => undefined);
    const manager = makeManager(async () => false);
    manager.registerQueue({ name: 'q', moduleId: 'hello-world', processor: ran });

    await capturedProcessors[0]({ data: { guildId: 'g1' } });

    expect(ran).not.toHaveBeenCalled();
  });

  test('a job for a guild that still wants the module RUNS', async () => {
    const ran = vi.fn(async () => undefined);
    const manager = makeManager(async () => true);
    manager.registerQueue({ name: 'q', moduleId: 'hello-world', processor: ran });

    await capturedProcessors[0]({ data: { guildId: 'g1' } });

    expect(ran).toHaveBeenCalledTimes(1);
  });

  test('the gate is asked about the job’s OWN guild, and the owner’s module', async () => {
    const gate = vi.fn(async () => true);
    const manager = makeManager(gate);
    manager.registerQueue({ name: 'q', moduleId: 'browse', processor: async () => undefined });

    await capturedProcessors[0]({ data: { guildId: 'g-42' } });

    expect(gate).toHaveBeenCalledWith('browse', 'g-42');
  });

  test('a FLEET-WIDE job (no guild) is not gated — a per-guild disable cannot address it', async () => {
    const gate = vi.fn(async () => false);
    const ran = vi.fn(async () => undefined);
    const manager = makeManager(gate);
    manager.registerQueue({ name: 'q', moduleId: 'hello-world', processor: ran });

    await capturedProcessors[0]({ data: { some: 'payload' } });

    expect(ran).toHaveBeenCalledTimes(1);
    expect(gate).not.toHaveBeenCalled();
  });

  test('a queue with no owner is not gated', async () => {
    const gate = vi.fn(async () => false);
    const ran = vi.fn(async () => undefined);
    const manager = makeManager(gate);
    manager.registerQueue({ name: 'q', processor: ran });

    await capturedProcessors[0]({ data: { guildId: 'g1' } });

    expect(ran).toHaveBeenCalledTimes(1);
    expect(gate).not.toHaveBeenCalled();
  });

  test('a FAILING gate fails OPEN — an outage must not silently drop live work', async () => {
    const ran = vi.fn(async () => undefined);
    const manager = makeManager(async () => {
      throw new Error('database unavailable');
    });
    manager.registerQueue({ name: 'q', moduleId: 'hello-world', processor: ran });

    await capturedProcessors[0]({ data: { guildId: 'g1' } });

    expect(ran).toHaveBeenCalledTimes(1);
  });
});

describe('a disabled module’s cron does not fire (UR-20261012-069)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeLockStore() {
    const setNX = vi.fn(async (): Promise<boolean> => true);
    const release = vi.fn(async () => undefined);
    return { store: { setNX, release } as unknown as LockStore, setNX };
  }

  function makeTask(name: string, cron: string) {
    return {
      name,
      cron,
      execute: vi.fn(async () => undefined),
    } as unknown as BaseTask & { execute: ReturnType<typeof vi.fn> };
  }

  test('a task whose module no guild wants does NOT execute', async () => {
    const { store } = makeLockStore();
    const gate = vi.fn(async () => false);
    const scheduler = new Scheduler({
      logger: logger() as never,
      lockStore: store,
      isModuleEnabledAnywhere: gate,
    });
    const task = makeTask('sweep', '*/1');
    scheduler.register(task, 'hello-world');
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(gate).toHaveBeenCalledWith('hello-world');
    expect(task.execute).not.toHaveBeenCalled();
  });

  test('a task whose module is still wanted executes', async () => {
    const { store } = makeLockStore();
    const scheduler = new Scheduler({
      logger: logger() as never,
      lockStore: store,
      isModuleEnabledAnywhere: async () => true,
    });
    const task = makeTask('sweep', '*/1');
    scheduler.register(task, 'hello-world');
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(task.execute).toHaveBeenCalledTimes(1);
  });

  test('a task with no owner (a core task) is never gated', async () => {
    const { store } = makeLockStore();
    const gate = vi.fn(async () => false);
    const scheduler = new Scheduler({
      logger: logger() as never,
      lockStore: store,
      isModuleEnabledAnywhere: gate,
    });
    const task = makeTask('audit-partition-maintenance', '*/1');
    scheduler.register(task);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(task.execute).toHaveBeenCalledTimes(1);
    expect(gate).not.toHaveBeenCalled();
  });

  test('a FAILING gate fails OPEN', async () => {
    const { store } = makeLockStore();
    const scheduler = new Scheduler({
      logger: logger() as never,
      lockStore: store,
      isModuleEnabledAnywhere: async () => {
        throw new Error('database unavailable');
      },
    });
    const task = makeTask('sweep', '*/1');
    scheduler.register(task, 'hello-world');
    scheduler.start();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(task.execute).toHaveBeenCalledTimes(1);
  });
});
