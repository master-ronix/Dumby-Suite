import type { Logger } from '../logging/logger.js';
import type { LockStore } from '../cache/redis-lock-store.js';
import type { BaseTask } from './base-processor.js';

const LOCK_TTL_MS = 30_000;
const OWNER_ID = 'scheduler';

export interface SchedulerDeps {
  logger: Logger;
  lockStore: LockStore;
  now?: () => number;
  /**
   * UR-20261012-069 — a cron task is FLEET-WIDE: `BaseTask.execute()` takes no guild, so a per-guild
   * disable cannot address it the way it addresses a command, an event or a job. The faithful reading
   * of "the module's schedule stops" is therefore: the task runs while at least one guild wants the
   * module, and stops when none does. Absent, tasks run as before.
   */
  isModuleEnabledAnywhere?: (moduleId: string) => Promise<boolean>;
}

export interface ScheduledTask {
  name: string;
  cron: string;
  task: BaseTask;
  intervalMs: number;
  lastTickAt?: number;
  /** UR-20261012-069 — the module that registered the task, so its firing can be gated. */
  moduleId?: string;
}

export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly deps: SchedulerDeps;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
  }

  register(task: BaseTask, moduleId?: string): void {
    this.tasks.set(task.name, {
      name: task.name,
      cron: task.cron,
      task,
      intervalMs: this.cronToMs(task.cron),
      ...(moduleId !== undefined ? { moduleId } : {}),
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
        // UR-20261012-069 — a disabled module's schedule does not fire. Fail open, like the event
        // and job gates: an unavailable gate must not silently stop live work.
        if (!(await this.moduleEnabled(scheduled.moduleId))) {
          this.deps.logger.debug('scheduler-task-module-disabled', {
            task: name,
            moduleId: scheduled.moduleId,
          });
        } else {
          const now = this.deps.now?.() ?? Date.now();
          if (!scheduled.lastTickAt || now - scheduled.lastTickAt >= scheduled.intervalMs * 0.9) {
            scheduled.lastTickAt = now;
            await scheduled.task.execute();
          }
        }
      } catch (err) {
        this.deps.logger.error('scheduler-task-failed', { task: name, error: String(err) });
      } finally {
        await this.deps.lockStore.release(lockKey, OWNER_ID);
      }
    }
    this.arm(name, scheduled);
  }

  /** UR-20261012-069 — fails open; a task with no owner is never gated. */
  private async moduleEnabled(moduleId: string | undefined): Promise<boolean> {
    const check = this.deps.isModuleEnabledAnywhere;
    if (check === undefined || moduleId === undefined) return true;
    try {
      return await check(moduleId);
    } catch (err) {
      this.deps.logger.warn('scheduler-module-gate-failed', { moduleId, error: String(err) });
      return true;
    }
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
