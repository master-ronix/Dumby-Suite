import { Queue, Worker, QueueEvents, type Processor, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Logger } from '../logging/logger.js';
import { DlqMonitor, QueueAutoscaler } from './autoscaler.js';
import type { ProcessRegistry, ProcessHandle } from '../module-system/process-registry.js';
import type { ProcessStandingReader } from '../module-system/process-standing.js';

export interface QueueManagerOptions {
  connection: Redis;
  logger: Logger;
  defaultConcurrency: number;
  /**
   * UR-20261012-069 — the guild module-enablement gate, in the (moduleId, guildId) order the event
   * router uses. A job whose module is disabled for the job's guild is skipped, so a disabled module's
   * queued work stops firing (§13.2, "its handlers stop firing"). Late-bound: the enablement check is
   * defined after the queue manager is constructed. Absent, or a job with no guild, runs as before.
   */
  isModuleEnabled?: (moduleId: string, guildId: string) => Promise<boolean>;
  /**
   * MB-4 (UR-20261027-105) — the one standing read, which FAILS CLOSED where `isModuleEnabled` fails
   * open. Present, it takes precedence: a job for a module the guild has disabled does no work, and an
   * unreadable state row skips rather than runs.
   */
  standing?: ProcessStandingReader;
  /** MB-4 — the process register, so every job carries the same provenance tuple a command does. */
  registry?: ProcessRegistry;
  /** The profile this worker belongs to — `'main'`, or a persona's id. */
  profileId?: string;
  profileKind?: 'main' | 'persona';
}

export interface RegisterQueueOptions<T = unknown> {
  name: string;
  /** MB-4 — a processor may take an `AbortSignal`; one that ignores it still runs, just uncancellably. */
  processor:
    | Processor<T>
    | ((job: { data: T; id?: string }, token?: string, signal?: AbortSignal) => Promise<unknown>);
  concurrency?: number;
  minConcurrency?: number;
  maxConcurrency?: number;
  /**
   * UR-20261012-069 — the module that owns this queue. Supplied by the loader; without it the queue
   * has no owner to gate on and runs unconditionally (the previous behaviour).
   */
  moduleId?: string;
}

/** The guild a job belongs to, when it names one. A job with no guild is fleet-wide and not gated. */
function guildIdFromJobData(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const candidate = data as { guildId?: unknown; guild?: { id?: unknown } };
  if (typeof candidate.guildId === 'string') return candidate.guildId;
  if (typeof candidate.guild?.id === 'string') return candidate.guild.id;
  return undefined;
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
  /** MB-4 — one controller per in-flight job, so a disable can ask it to stop. */
  private readonly inFlight = new Map<string, AbortController>();
  private readonly dlqMonitor = new DlqMonitor(10);
  private dlqTimer: NodeJS.Timeout | null = null;

  constructor(private readonly options: QueueManagerOptions) {}

  /**
   * MB-4 — the disable path for queued work. Aborts every in-flight job's cooperative signal and marks
   * their rows terminated. Queued-but-unstarted jobs are not drained here: the gate refuses them when
   * they are dequeued, which is cheaper and survives a restart.
   */
  terminateModule(moduleId: string, reason = 'module-disabled'): number {
    let aborted = 0;
    for (const [jobId, controller] of this.inFlight) {
      controller.abort(reason);
      this.inFlight.delete(jobId);
      aborted += 1;
    }
    this.options.registry?.terminateModule(moduleId, reason);
    if (aborted > 0) this.options.logger.info('jobs-terminated', { moduleId, aborted, reason });
    return aborted;
  }

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
    // UR-20261012-069 — gate the processor on the owning module's standing in the job's guild. A
    // per-guild disable is a state-table write, not an unload (§13.7), so the queue stays registered
    // and the ENFORCEMENT happens here, at execution, exactly as the event router does it.
    const gated: Processor<T> = async (job, token) => {
      const moduleId = opts.moduleId;
      const guildId = guildIdFromJobData(job.data);
      const standingReader = this.options.standing;
      let provenance: { enabledBy: string | null; enabledAt: Date | null } = {
        enabledBy: null,
        enabledAt: null,
      };

      if (moduleId !== undefined && guildId !== undefined) {
        if (standingReader !== undefined) {
          // MB-4 — one read, fail CLOSED. An unreadable row skips the job and says why.
          const standing = await standingReader.forGuild({
            moduleId,
            guildId,
            profileId: this.options.profileId ?? 'main',
          });
          if (!standing.allowed) {
            this.options.logger.debug('job-skipped-module-disabled', {
              queue: opts.name,
              moduleId,
              guildId,
              reason: standing.reason,
            });
            return;
          }
          provenance = { enabledBy: standing.enabledBy, enabledAt: standing.enabledAt };
        } else if (!(await this.moduleEnabled(moduleId, guildId))) {
          this.options.logger.debug('job-skipped-module-disabled', {
            queue: opts.name,
            moduleId,
            guildId,
          });
          return;
        }
      }

      const controller = new AbortController();
      const handle: ProcessHandle | undefined =
        moduleId === undefined
          ? undefined
          : this.options.registry?.begin({
              moduleId,
              name: opts.name,
              kind: 'job',
              profileId: this.options.profileId ?? 'main',
              profileKind: this.options.profileKind ?? 'main',
              guildId: guildId ?? null,
              trigger: 'queue',
              enabledBy: provenance.enabledBy,
              enabledAt: provenance.enabledAt,
            });
      this.inFlight.set(String(job.id ?? ''), controller);
      try {
        const result = await (
          opts.processor as (
            j: { data: T; id?: string },
            tok?: string,
            sig?: AbortSignal,
          ) => Promise<unknown>
        )(job, token, controller.signal);
        handle?.end('completed');
        return result;
      } catch (err) {
        handle?.end('completed', 'threw');
        throw err;
      } finally {
        this.inFlight.delete(String(job.id ?? ''));
      }
    };
    const worker = new Worker<T>(opts.name, gated, { connection, concurrency });
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

  /** UR-20261012-069 — fails open, like the event gate: an unavailable gate must not drop live work. */
  private async moduleEnabled(moduleId: string, guildId: string): Promise<boolean> {
    const check = this.options.isModuleEnabled;
    if (check === undefined) return true;
    try {
      return await check(moduleId, guildId);
    } catch (err) {
      this.options.logger.warn('job-module-gate-failed', { moduleId, guildId, error: String(err) });
      return true;
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
