import type { Logger } from '../logging/logger.js';
import type { LockStore } from '../cache/redis-lock-store.js';
import type { BaseTask } from './base-processor.js';

const LOCK_TTL_MS = 30_000;
const OWNER_ID = 'scheduler';

export interface SchedulerDeps {
  logger: Logger;
  lockStore: LockStore;
  now?: () => number;
}

export interface ScheduledTask {
  name: string;
  cron: string;
  task: BaseTask;
  intervalMs: number;
  lastTickAt?: number;
}

export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly deps: SchedulerDeps;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
  }

  register(task: BaseTask): void {
    this.tasks.set(task.name, {
      name: task.name,
      cron: task.cron,
      task,
      intervalMs: this.cronToMs(task.cron),
    });
  }

  start(): void {
    for (const [name, scheduled] of this.tasks) {
      this.arm(name, scheduled);
    }
    this.deps.logger.info('scheduler-started', { taskCount: this.tasks.size });
  }

  stop(): void {
    for (const [name, timer] of this.timers) {
      clearTimeout(timer);
      this.deps.logger.info('scheduler-task-stopped', { task: name });
    }
    this.timers.clear();
  }

  /** Arm a task's next occurrence; each run re-arms itself, so a calendar cron lands on time. */
  private arm(name: string, scheduled: ScheduledTask): void {
    const delay = this.nextDelayMs(scheduled.cron, this.deps.now?.() ?? Date.now());
    const timer = setTimeout(() => {
      void this.tick(name, scheduled);
    }, delay);
    this.timers.set(name, timer);
  }

  private async tick(name: string, scheduled: ScheduledTask): Promise<void> {
    const lockKey = `task-lock:${name}:${Math.floor(Date.now() / scheduled.intervalMs)}`;
    const acquired = await this.deps.lockStore.setNX(lockKey, OWNER_ID, LOCK_TTL_MS);
    if (acquired) {
      try {
        const now = this.deps.now?.() ?? Date.now();
        if (!scheduled.lastTickAt || now - scheduled.lastTickAt >= scheduled.intervalMs * 0.9) {
          scheduled.lastTickAt = now;
          await scheduled.task.execute();
        }
      } catch (err) {
        this.deps.logger.error('scheduler-task-failed', { task: name, error: String(err) });
      } finally {
        await this.deps.lockStore.release(lockKey, OWNER_ID);
      }
    }
    this.arm(name, scheduled);
  }

  /**
   * The ms until the next run. Interval crons (`* /N` minutes, `0 * /H * * *` hours) repeat on a
   * fixed period; calendar crons (`0 H * * *`, `0 H D * *`) resolve to the next matching time, so
   * a monthly task is monthly rather than every minute.
   */
  private nextDelayMs(cron: string, from: number): number {
    const [minute, hour, dayOfMonth] = cron.split(' ');
    if (minute?.startsWith('*/') || hour?.startsWith('*/')) {
      return this.cronToMs(cron);
    }
    if (minute !== undefined && hour !== undefined && /^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      const target = new Date(from);
      target.setUTCSeconds(0, 0);
      target.setUTCHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
      if (dayOfMonth !== undefined && /^\d+$/.test(dayOfMonth)) {
        target.setUTCDate(parseInt(dayOfMonth, 10));
        while (target.getTime() <= from) target.setUTCMonth(target.getUTCMonth() + 1);
      } else {
        while (target.getTime() <= from) target.setUTCDate(target.getUTCDate() + 1);
      }
      return target.getTime() - from;
    }
    return 60_000;
  }

  private cronToMs(cron: string): number {
    const [minute, hour] = cron.split(' ');
    if (minute?.startsWith('*/')) {
      const minutes = parseInt(minute.slice(2), 10);
      return minutes * 60_000;
    }
    if (hour?.startsWith('*/')) {
      const hours = parseInt(hour.slice(2), 10);
      return hours * 3_600_000;
    }
    return 60_000;
  }
}
