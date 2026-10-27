import type { Logger } from '../logging/logger.js';

/**
 * MB-4 (UR-20261027-105) — the process registry.
 *
 * A module's processes (a cron task, a queued job, a loop started in `onEnable`) had no register. A
 * command has a row in `guild_command_overrides`, a module has a row in `guild_module_states`, and a
 * process had nothing — so "which profile is running this, in which guild, since when, enabled by
 * whom, and is it still alive?" could not be answered at all.
 *
 * This is that register: one row per live process, carrying the same provenance tuple a command
 * carries, plus a cooperative cancellation handle. It is in memory by design — a process does not
 * survive the process that runs it, so persisting the rows would only ever record the past.
 */
export type ProcessKind = 'task' | 'job' | 'loop';
export type ProcessState = 'running' | 'completed' | 'terminated' | 'skipped';

export interface ProcessDescriptor {
  readonly moduleId: string;
  readonly name: string;
  readonly kind: ProcessKind;
  /** `'main'`, or the persona's id. */
  readonly profileId: string;
  readonly profileKind: 'main' | 'persona';
  /** The guild this work serves; null only for explicit fleet-wide work. */
  readonly guildId: string | null;
  /** What started it — `'cron'`, `'queue'`, `'enable'`, or the caller's own word. */
  readonly trigger: string;
  readonly enabledBy: string | null;
  readonly enabledAt: Date | null;
}

export interface ProcessRecord extends ProcessDescriptor {
  readonly id: string;
  readonly startedAt: Date;
  readonly state: ProcessState;
  readonly endedAt: Date | null;
  /**
   * False when the enabler is unknown — a row written before `enabledBy` existed, or a core-tier
   * module that nobody enabled. The FIELDS are always present; this says whether they carry a value,
   * which is the difference between "we looked and there is nothing" and "we never looked".
   */
  readonly provenanceComplete: boolean;
  readonly endReason: string | null;
}

export interface ProcessHandle {
  readonly id: string;
  readonly signal: AbortSignal;
  /** Close the row. Idempotent: the first state wins, later calls are ignored. */
  end(state: ProcessState, reason?: string): void;
}

export class ProcessProvenanceError extends Error {
  constructor(
    readonly moduleId: string,
    readonly missing: readonly string[],
  ) {
    super(
      `Process for module "${moduleId}" is missing provenance field(s): ${missing.join(', ')}. ` +
        `Every live process carries the same tuple a command carries — which profile, which guild, ` +
        `what triggered it, who enabled it and when.`,
    );
    this.name = 'ProcessProvenanceError';
  }
}

export interface ProcessRegistryOptions {
  readonly logger?: Logger;
  readonly now?: () => Date;
  /** Cap on retained rows, so a chatty module cannot grow the register without bound. */
  readonly maxRows?: number;
}

const DEFAULT_MAX_ROWS = 5_000;
const REQUIRED_FIELDS: readonly (keyof ProcessDescriptor)[] = [
  'moduleId',
  'name',
  'kind',
  'profileId',
  'profileKind',
  'trigger',
];

export class ProcessRegistry {
  private readonly rows = new Map<string, ProcessRecord>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly now: () => Date;
  private readonly logger: Logger | undefined;
  private readonly maxRows: number;
  private nextId = 1;

  constructor(options: ProcessRegistryOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger;
    this.maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  }

  /** Which required fields are absent (not merely null) on this descriptor. */
  static validate(descriptor: ProcessDescriptor): string[] {
    const missing: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const value = descriptor[field];
      if (value === undefined || value === null || value === '') missing.push(String(field));
    }
    if (!('guildId' in descriptor)) missing.push('guildId');
    if (!('enabledBy' in descriptor)) missing.push('enabledBy');
    if (!('enabledAt' in descriptor)) missing.push('enabledAt');
    return missing;
  }

  begin(descriptor: ProcessDescriptor): ProcessHandle {
    const missing = ProcessRegistry.validate(descriptor);
    if (missing.length > 0) throw new ProcessProvenanceError(descriptor.moduleId, missing);

    const provenanceComplete = descriptor.enabledBy !== null && descriptor.enabledAt !== null;
    if (descriptor.guildId !== null && !provenanceComplete) {
      // Not fatal: a row written before `enabledBy` existed has no enabler to report, and refusing to
      // start live work over an unknown author would be worse than recording the unknown.
      this.logger?.warn('process-provenance-incomplete', {
        moduleId: descriptor.moduleId,
        name: descriptor.name,
        guildId: descriptor.guildId,
      });
    }

    const id = `proc_${this.nextId++}`;
    const controller = new AbortController();
    const record: ProcessRecord = {
      ...descriptor,
      id,
      startedAt: this.now(),
      state: 'running',
      endedAt: null,
      provenanceComplete,
      endReason: null,
    };
    this.rows.set(id, record);
    this.controllers.set(id, controller);
    this.evict();

    return {
      id,
      signal: controller.signal,
      end: (state: ProcessState, reason?: string) => this.end(id, state, reason),
    };
  }

  private end(id: string, state: ProcessState, reason?: string): void {
    const record = this.rows.get(id);
    if (record === undefined || record.state !== 'running') return;
    this.rows.set(id, {
      ...record,
      state,
      endedAt: this.now(),
      endReason: reason ?? null,
    });
    this.controllers.delete(id);
  }

  /**
   * Terminate every live process of one module — the disable path.
   *
   * It aborts the cooperative signal, which is all a running function can be given: JavaScript cannot
   * pre-empt an await. The contract is therefore *cooperative termination*, and the scheduler also
   * stops re-arming, so a task that ignores its signal runs at most one more time to completion.
   */
  terminateModule(moduleId: string, reason = 'module-disabled'): number {
    let terminated = 0;
    for (const [id, record] of this.rows) {
      if (record.state !== 'running' || record.moduleId !== moduleId) continue;
      const controller = this.controllers.get(id);
      if (controller !== undefined) {
        controller.abort(reason);
        this.controllers.delete(id);
      }
      this.rows.set(id, { ...record, state: 'terminated', endedAt: this.now(), endReason: reason });
      terminated += 1;
    }
    if (terminated > 0) {
      this.logger?.info('process-module-terminated', { moduleId, terminated, reason });
    }
    return terminated;
  }

  /** Abort one process by id (a targeted stop, e.g. a queue cancel). */
  terminate(id: string, reason = 'terminated'): boolean {
    const record = this.rows.get(id);
    if (record === undefined || record.state !== 'running') return false;
    this.controllers.get(id)?.abort(reason);
    this.controllers.delete(id);
    this.rows.set(id, { ...record, state: 'terminated', endedAt: this.now(), endReason: reason });
    return true;
  }

  snapshot(): readonly ProcessRecord[] {
    return [...this.rows.values()];
  }

  live(): readonly ProcessRecord[] {
    return [...this.rows.values()].filter((row) => row.state === 'running');
  }

  get(id: string): ProcessRecord | undefined {
    return this.rows.get(id);
  }

  private evict(): void {
    if (this.rows.size <= this.maxRows) return;
    // Oldest finished rows first; a live row is never evicted.
    const finished = [...this.rows.values()]
      .filter((row) => row.state !== 'running')
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    for (const row of finished) {
      if (this.rows.size <= this.maxRows) break;
      this.rows.delete(row.id);
    }
  }
}
