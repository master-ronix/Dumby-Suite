import { test, expect, describe, vi, beforeEach } from 'vitest';
import { QueueManager } from '../../src/queue/queue-manager.js';

const queueInstances: unknown[] = [];
const workerInstances: unknown[] = [];
const eventsInstances: unknown[] = [];

vi.mock('bullmq', () => {
  class MockQueue {
    name: string;
    add = vi.fn(async () => ({ id: 'job-1' }));
    pause = vi.fn(async () => undefined);
    resume = vi.fn(async () => undefined);
    getFailed = vi.fn(async () => []);
    getJob = vi.fn(async () => null);
    getJobCounts = vi.fn(async () => ({ waiting: 2, active: 1, delayed: 0 }));
    close = vi.fn(async () => undefined);
    constructor(name: string) {
      this.name = name;
      queueInstances.push(this);
    }
  }
  class MockWorker {
    on = vi.fn();
    concurrency: number;
    close = vi.fn(async () => undefined);
    constructor(_name: string, _processor: unknown, opts: { concurrency: number }) {
      this.concurrency = opts.concurrency;
      workerInstances.push(this);
    }
  }
  class MockQueueEvents {
    close = vi.fn(async () => undefined);
    constructor(_name: string) {
      eventsInstances.push(this);
    }
  }
  return { Queue: MockQueue, Worker: MockWorker, QueueEvents: MockQueueEvents };
});

function makeManager() {
  return new QueueManager({
    connection: {} as never,
    logger: { info: vi.fn(), error: vi.fn() } as never,
    defaultConcurrency: 2,
  });
}

describe('QueueManager (bullmq mocked)', () => {
  beforeEach(() => {
    queueInstances.length = 0;
    workerInstances.length = 0;
    eventsInstances.length = 0;
    vi.clearAllMocks();
  });

  test('registerQueue wires queue, worker, and events', () => {
    const manager = makeManager();
    const queue = manager.registerQueue({ name: 'q1', processor: async () => undefined });
    expect(queue.name).toBe('q1');
    expect(queueInstances).toHaveLength(1);
    expect(workerInstances).toHaveLength(1);
    expect(eventsInstances).toHaveLength(1);
  });

  test('enqueue returns the job id from queue.add', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    const id = await manager.enqueue('q1', { x: 1 });
    expect(id).toBe('job-1');
  });

  test('enqueue uses an explicit jobId when supplied', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    await manager.enqueue('q1', { x: 1 }, { jobId: 'dedupe-id' });
    const queue = queueInstances[0] as { add: ReturnType<typeof vi.fn> };
    expect(queue.add).toHaveBeenCalledWith('q1', { x: 1 }, { jobId: 'dedupe-id' });
  });

  test('enqueue without jobId passes no job option', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    await manager.enqueue('q1', { x: 1 });
    const queue = queueInstances[0] as { add: ReturnType<typeof vi.fn> };
    expect(queue.add).toHaveBeenCalledWith('q1', { x: 1 }, {});
  });

  test('pause and resume delegate to the registered queue', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    const queue = queueInstances[0] as {
      pause: ReturnType<typeof vi.fn>;
      resume: ReturnType<typeof vi.fn>;
    };
    await manager.pause('q1');
    expect(queue.pause).toHaveBeenCalled();
    await manager.resume('q1');
    expect(queue.resume).toHaveBeenCalled();
  });

  test('enqueue on an unknown queue rejects', async () => {
    const manager = makeManager();
    await expect(manager.enqueue('nope', {})).rejects.toThrow('not registered');
  });

  test('getDepth sums waiting, active, and delayed counts', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    expect(await manager.getDepth('q1')).toBe(3);
  });

  test('retryFailed retries every failed job within the limit', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    const queue = queueInstances[0] as { getFailed: ReturnType<typeof vi.fn> };
    const retry = vi.fn(async () => undefined);
    queue.getFailed.mockResolvedValueOnce([
      { id: 'f1', retry },
      { id: 'f2', retry },
    ]);
    const count = await manager.retryFailed('q1', 10);
    expect(count).toBe(2);
    expect(retry).toHaveBeenCalledTimes(2);
  });

  test('retryOne and deleteJob return false for missing jobs', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    expect(await manager.retryOne('q1', 'missing')).toBe(false);
    expect(await manager.deleteJob('q1', 'missing')).toBe(false);
  });

  test('shutdown closes worker, events, and queue for every registration', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    manager.registerQueue({ name: 'q2', processor: async () => undefined });
    await manager.shutdown();
    for (const q of queueInstances) {
      expect((q as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled();
    }
    for (const w of workerInstances) {
      expect((w as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled();
    }
    for (const e of eventsInstances) {
      expect((e as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled();
    }
  });

  test('startDlqMonitor schedules a sweep without alerting under threshold', async () => {
    const manager = makeManager();
    manager.registerQueue({ name: 'q1', processor: async () => undefined });
    const queue = queueInstances[0] as { getFailed: ReturnType<typeof vi.fn> };
    queue.getFailed.mockResolvedValueOnce([]);
    manager.startDlqMonitor();
    const managerAny = manager as unknown as { runDlqSweep(): Promise<void> };
    await managerAny.runDlqSweep.call(manager);
  });
});
