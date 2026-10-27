export interface JobPayload {
  [key: string]: unknown;
}

/**
 * MB-4 (UR-20261027-105) — the cooperative cancellation contract.
 *
 * A module's process is handed an `AbortSignal` so the framework can ask it to stop when the module is
 * disabled. It is OPTIONAL, so every existing processor and task keeps its signature: a processor that
 * ignores it still runs, it simply cannot be asked to stop early.
 *
 * JavaScript cannot pre-empt a running function, so "instant" means: the signal fires immediately, the
 * scheduler stops re-arming, and a cooperative processor returns at its next await. A processor that
 * never checks the signal finishes its current run — that limitation is the contract, not a bug.
 */
export abstract class BaseProcessor<TPayload extends JobPayload = JobPayload> {
  abstract process(job: { data: TPayload; id?: string }, signal?: AbortSignal): Promise<void>;
}

export abstract class BaseTask {
  abstract execute(signal?: AbortSignal): Promise<void>;
  abstract cron: string;
  abstract name: string;
}
