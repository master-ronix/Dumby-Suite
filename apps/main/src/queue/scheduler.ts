import type { Logger } from '../logging/logger.js';
import type { LockStore } from '../cache/redis-lock-store.js';
import type { BaseTask } from './base-processor.js';
import type { ProcessRegistry, ProcessHandle } from '../module-system/process-registry.js';
import type { ProcessStandingReader } from '../module-system/process-standing.js';

const LOCK_TTL_MS = 30_000;
const OWNER_ID = 'scheduler';

/**
 * MB-4 (UR-20261027-105) — a cron task is now a PROCESS with an owner, a scope and a handle.
 *
 * Before this, a task's only protection was `isModuleEnabledAnywhere`: "does ANY guild want the
 * module?" — a different question from "is it enabled for the profile and guild this work serves",
 * and it failed OPEN. A task also had no provenance and no way to be stopped: disabling a module
 * stopped the NEXT tick and let the running one finish, which is the opposite of the directive.
 *
 * Now: a task declares its scope (profile, and either a guild or an explicit `fleetWide` opt-in), the
 * gate reads one standing (fail closed), the run is recorded in the `ProcessRegistry` with the full
 * provenance tuple, and `terminateModule` aborts the cooperative signal and stops re-arming.
 */
export interface SchedulerDeps {
  logger: Logger;
  lockStore: LockStore;
  now?: () => number;
  /**
   * UR-20261012-069, kept for the fleet-wide opt-in path and for callers that pass no scope. Absent,
   * and with no `standing` reader, tasks run as before.
   */
  isModuleEnabledAnywhere?: (moduleId: string) => Promise<boolean>;
  /** MB-4 — the one standing read. Present, it takes precedence over `isModuleEnabledAnywhere`. */
  standing?: ProcessStandingReader;
  /** MB-4 — the process register. Absent, runs are not recorded (but still gated). */
  registry?: ProcessRegistry;
  /** The profile this scheduler belongs to — `'main'`, or a persona's id. */
  profileId?: string;
  profileKind?: 'main' | 'persona';
}

/** MB-4 — what a task declares about the work it does. */
export interface TaskScope {
  readonly guildId?: string | null;
  /**
   * Explicit opt-in: the task serves no guild and runs while at least one guild wants the module.
   * A task with neither a guild nor this flag is scoped to the scheduler's profile and gated per guild
   * only when a guild is declared — see `ScheduledTask.scope`.
   */
  readonly fleetWide?: boolean;
  readonly profileId?: string;
}

export interface ScheduledTask {
  name: string;
  cron: string;
  task: BaseTask;
  intervalMs: number;
  lastTickAt?: number;
  /** UR-20261012-069 — the module that registered the task, so its firing can be gated. */
  moduleId?: string;
  /** MB-4 — the work's scope. */
  scope?: TaskScope;
  /** MB-4 — set when the module was disabled; the task stops re-arming. */
  terminated?: boolean;
  terminatedReason?: string;
}

export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly deps: SchedulerDeps;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
  }

  register(task: BaseTask, moduleId?: string, scope?: TaskScope): void {
    this.tasks.set(task.name, {
      name: task.name,
      cron: task.cron,
      task,
      intervalMs: this.cronToMs(task.cron),
      ...(moduleId !== undefined ? { moduleId } : {}),
      ...(scope !== undefined ? { scope } : {}),
    });
    this.controllers.set(task.name, new AbortController());
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

  /**
   * MB-4 — the disable path. Abort every task the module owns, stop re-arming them, and mark their
   * rows terminated. Returns how many tasks were stopped.
   */
  terminateModule(moduleId: string, reason = 'module-disabled'): number {
    let stopped = 0;
    for (const [name, scheduled] of this.tasks) {
      if (scheduled.moduleId !== moduleId || scheduled.terminated === true) continue;
      const controller = this.controllers.get(name);
      controller?.abort(reason);
      this.controllers.delete(name);
      const timer = this.timers.get(name);
      if (timer !== undefined) {
        clearTimeout(timer);
        this.timers.delete(name);
      }
      this.tasks.set(name, { ...scheduled, terminated: true, terminatedReason: reason });
      stopped += 1;
      this.deps.logger.info('scheduler-task-terminated', { task: name, moduleId, reason });
    }
    this.deps.registry?.terminateModule(moduleId, reason);
    return stopped;
  }

  /** MB-4 — is this task still allowed to run? Re-enabling clears the termination. */
  resumeModule(moduleId: string): number {
    let resumed = 0;
    for (const [name, scheduled] of this.tasks) {
      if (scheduled.moduleId !== moduleId || scheduled.terminated !== true) continue;
      const restarted: ScheduledTask = { ...scheduled };
      delete restarted.terminated;
      delete restarted.terminatedReason;
      this.tasks.set(name, restarted);
      this.controllers.set(name, new AbortController());
      this.arm(name, restarted);
      resumed += 1;
    }
    return resumed;
  }

  /** Arm a task's next occurrence; each run re-arms itself, so a calendar cron lands on time. */
  private arm(name: string, scheduled: ScheduledTask): void {
    if (scheduled.terminated === true) return;
    const delay = this.nextDelayMs(scheduled.cron, this.deps.now?.() ?? Date.now());
    const timer = setTimeout(() => {
      void this.tick(name, scheduled);
    }, delay);
    this.timers.set(name, timer);
  }

  private async tick(name: string, scheduled: ScheduledTask): Promise<void> {
    if (scheduled.terminated === true) {
      this.deps.logger.debug('scheduler-task-terminated-skip', { task: name });
      return;
    }
    const lockKey = `task-lock:${name}:${Math.floor(Date.now() / scheduled.intervalMs)}`;
    const acquired = await this.deps.lockStore.setNX(lockKey, OWNER_ID, LOCK_TTL_MS);
    if (acquired) {
      let handle: ProcessHandle | undefined;
      try {
        const standing = await this.standingFor(scheduled);
        if (!standing.allowed) {
          // MB-4 — fail CLOSED: a skipped tick is recoverable, work for a disabled module is not.
          this.deps.logger.debug('scheduler-task-module-disabled', {
            task: name,
            moduleId: scheduled.moduleId,
            reason: standing.reason,
          });
        } else {
          const now = this.deps.now?.() ?? Date.now();
          if (!scheduled.lastTickAt || now - scheduled.lastTickAt >= scheduled.intervalMs * 0.9) {
            scheduled.lastTickAt = now;
            const controller = this.controllers.get(name) ?? new AbortController();
            this.controllers.set(name, controller);
            handle = this.deps.registry?.begin({
              moduleId: scheduled.moduleId ?? 'unknown',
              name,
              kind: 'task',
              profileId: scheduled.scope?.profileId ?? this.deps.profileId ?? 'main',
              profileKind: this.deps.profileKind ?? 'main',
              guildId: scheduled.scope?.guildId ?? null,
              trigger: 'cron',
              enabledBy: standing.enabledBy,
              enabledAt: standing.enabledAt,
            });
            await scheduled.task.execute(controller.signal);
            handle?.end('completed');
          }
        }
      } catch (err) {
        handle?.end('completed', 'threw');
        this.deps.logger.error('scheduler-task-failed', { task: name, error: String(err) });
      } finally {
        await this.deps.lockStore.release(lockKey, OWNER_ID);
      }
    }
    this.arm(name, scheduled);
  }

  /**
   * MB-4 — one standing read. With a `standing` reader, a task scoped to a guild is gated per guild and
   * a task that opted into `fleetWide` (or declares no guild) is gated fleet-wide; both fail closed.
   * Without one, the legacy `isModuleEnabledAnywhere` path is kept, and still fails open.
   */
  private async standingFor(scheduled: ScheduledTask): Promise<{
    allowed: boolean;
    reason: string;
    enabledBy: string | null;
    enabledAt: Date | null;
  }> {
    const moduleId = scheduled.moduleId;
    const reader = this.deps.standing;
    if (moduleId === undefined) {
      return { allowed: true, reason: 'no-owner', enabledBy: null, enabledAt: null };
    }
    if (reader !== undefined) {
      const profileId = scheduled.scope?.profileId ?? this.deps.profileId ?? 'main';
      const guildId = scheduled.scope?.guildId ?? null;
      if (guildId !== null && scheduled.scope?.fleetWide !== true) {
        const standing = await reader.forGuild({ moduleId, guildId, profileId });
        return {
          allowed: standing.allowed,
          reason: standing.reason,
          enabledBy: standing.enabledBy,
          enabledAt: standing.enabledAt,
        };
      }
      const standing = await reader.forFleet(moduleId, profileId);
      return {
        allowed: standing.allowed,
        reason: standing.reason,
        enabledBy: standing.enabledBy,
        enabledAt: standing.enabledAt,
      };
    }
    return {
      allowed: await this.moduleEnabled(moduleId),
      reason: 'legacy-gate',
      enabledBy: null,
      enabledAt: null,
    };
  }

  /** UR-20261012-069 — fails open; a task with no owner is never gated. Legacy path only. */
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
