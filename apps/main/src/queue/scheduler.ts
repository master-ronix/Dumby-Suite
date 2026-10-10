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
  private timers = new Map<string, ReturnType<typeof setInterval>>();
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
      const timer = setInterval(async () => {
        const lockKey = `task-lock:${name}:${Math.floor(Date.now() / scheduled.intervalMs)}`;
        const acquired = await this.deps.lockStore.setNX(lockKey, OWNER_ID, LOCK_TTL_MS);
        if (!acquired) return;

        try {
          const now = this.deps.now?.() ?? Date.now();
          if (scheduled.lastTickAt && now - scheduled.lastTickAt < scheduled.intervalMs * 0.9) {
            return;
          }
          scheduled.lastTickAt = now;
          await scheduled.task.execute();
        } catch (err) {
          this.deps.logger.error('scheduler-task-failed', { task: name, error: String(err) });
        } finally {
          await this.deps.lockStore.release(lockKey, OWNER_ID);
        }
      }, scheduled.intervalMs);

      this.timers.set(name, timer);
    }
    this.deps.logger.info('scheduler-started', { taskCount: this.tasks.size });
  }

  stop(): void {
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      this.deps.logger.info('scheduler-task-stopped', { task: name });
    }
    this.timers.clear();
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
