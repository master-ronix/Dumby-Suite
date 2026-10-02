import { Queue, Worker, QueueEvents, type Processor, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from '../logging/logger.js';
import { DlqMonitor, QueueAutoscaler } from './autoscaler.js';

export interface QueueManagerOptions {
  connection: Redis;
  logger: Logger;
  defaultConcurrency: number;
}

export interface RegisterQueueOptions<T = unknown> {
  name: string;
  processor: Processor<T>;
  concurrency?: number;
  minConcurrency?: number;
  maxConcurrency?: number;
}

const REMOVE_ON_COMPLETE = { age: 3600, count: 1000 };
const REMOVE_ON_FAIL = false as const;
const DLQ_CHECK_INTERVAL_MS = 15 * 60 * 1000;

interface QueueEntry {
  queue: Queue;
  worker: Worker;
  events: QueueEvents;
  autoscaler: QueueAutoscaler;
  previousDepth: number;
}

export class QueueManager {
  private readonly entries = new Map<string, QueueEntry>();
  private readonly dlqMonitor = new DlqMonitor(10);
  private dlqTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: QueueManagerOptions) {}

  registerQueue<T = unknown>(opts: RegisterQueueOptions<T>): Queue<T> {
    const connection = this.options.connection as unknown as ConnectionOptions;

    const queue = new Queue<T>(opts.name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: REMOVE_ON_COMPLETE,
        removeOnFail: REMOVE_ON_FAIL,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
      },
    });

    const concurrency = opts.concurrency ?? this.options.defaultConcurrency;
    const worker = new Worker<T>(opts.name, opts.processor, { connection, concurrency });
    worker.on('failed', (job, err) => {
      this.options.logger.error('job-failed', {
        queue: opts.name,
        jobId: job?.id,
        error: String(err),
      });
    });

    const events = new QueueEvents(opts.name, { connection });
    const autoscaler = new QueueAutoscaler(
      opts.minConcurrency ?? 1,
      opts.maxConcurrency ?? concurrency * 4,
    );

    this.entries.set(opts.name, {
      queue: queue as unknown as Queue,
      worker: worker as unknown as Worker,
      events,
      autoscaler,
      previousDepth: 0,
    });
    return queue;
  }

  async enqueue<T = unknown>(
    queueName: string,
    data: T,
    opts: { jobId?: string; idempotencyKey?: string } = {},
  ): Promise<string> {
    const entry = this.getEntry(queueName);
    const jobId = opts.jobId ?? opts.idempotencyKey;
    const job = await entry.queue.add(queueName, data as object, jobId ? { jobId } : {});
    return job.id ?? '';
  }

  /** The names of every registered queue (finding #15 — the admin pause/resume routes need them). */
  list(): readonly string[] {
    return [...this.entries.keys()];
  }

  async pause(queueName: string): Promise<void> {
    await this.getEntry(queueName).queue.pause();
  }

  async resume(queueName: string): Promise<void> {
    await this.getEntry(queueName).queue.resume();
  }

  async retryFailed(queueName: string, limit = 100): Promise<number> {
    const entry = this.getEntry(queueName);
    const failed = await entry.queue.getFailed(0, limit);
    for (const job of failed) {
      await job.retry();
    }
    return failed.length;
  }

  async retryOne(queueName: string, jobId: string): Promise<boolean> {
    const entry = this.getEntry(queueName);
    const job = await entry.queue.getJob(jobId);
    if (!job) return false;
    await job.retry();
    return true;
  }

  async deleteJob(queueName: string, jobId: string): Promise<boolean> {
    const entry = this.getEntry(queueName);
    const job = await entry.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }

  async getDepth(queueName: string): Promise<number> {
    const entry = this.getEntry(queueName);
    const counts = await entry.queue.getJobCounts('waiting', 'active', 'delayed');
    return (counts['waiting'] ?? 0) + (counts['active'] ?? 0) + (counts['delayed'] ?? 0);
  }

  async tickAutoscaler(): Promise<void> {
    for (const [name, entry] of this.entries) {
      const depth = await this.getDepth(name);
      const decision = entry.autoscaler.evaluate(
        entry.worker.concurrency,
        depth,
        entry.previousDepth,
      );
      entry.previousDepth = depth;
      if (decision.action !== 'hold') {
        entry.worker.concurrency = decision.newConcurrency;
        this.options.logger.info('queue-autoscale', { queue: name, ...decision });
      }
    }
  }

  startDlqMonitor(): void {
    this.dlqTimer = setInterval(() => void this.runDlqSweep(), DLQ_CHECK_INTERVAL_MS);
    this.dlqTimer.unref?.();
  }

  private async runDlqSweep(): Promise<void> {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [name, entry] of this.entries) {
      const failedJobs = await entry.queue.getFailed(0, 1000);
      const failedLastHour = failedJobs.filter((j) => (j.finishedOn ?? 0) >= oneHourAgo).length;
      const result = this.dlqMonitor.evaluate(name, failedLastHour);
      if (result.shouldAlert) {
        this.options.logger.error('dlq-alert-threshold-exceeded', {
          queue: result.queue,
          failedCountLastHour: result.failedCountLastHour,
        });
      }
    }
  }

  private getEntry(name: string): QueueEntry {
    const entry = this.entries.get(name);
    if (!entry) throw new Error(`Queue "${name}" is not registered`);
    return entry;
  }

  async shutdown(): Promise<void> {
    if (this.dlqTimer) clearInterval(this.dlqTimer);
    for (const entry of this.entries.values()) {
      await entry.worker.close();
      await entry.events.close();
      await entry.queue.close();
    }
  }
}
