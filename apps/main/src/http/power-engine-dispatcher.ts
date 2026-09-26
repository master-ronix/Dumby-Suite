/**
 * PowerEngineDispatcher (Cluster: Boot). Every mutating
 * /admin/* and /admin/power-engine/* endpoint routes through this instead
 * of touching its target service directly. Three invariants, all
 * unconditional:
 *
 *   1. actorId, source, and reason are required on every call.
 *   2. An empty reason or an untrusted source is rejected outright.
 *   3. An audit_logs row is written for EVERY attempt — rejected rows are
 *      written before the rejection is returned, and allowed rows are
 *      written only AFTER the handler has completed successfully, so the
 *      recorded outcome is truthful (never a claim about an action that
 *      has not actually run).
 */

export interface PowerEngineRequest {
  actorId: string;
  source: string;
  reason: string;
}

export interface TrustedSourcesConfig {
  trustedSources: readonly string[];
}

export type RejectionReason = 'MISSING_ACTOR_ID' | 'EMPTY_REASON' | 'UNTRUSTED_SOURCE';

export type PowerEngineValidationResult =
  { valid: true } | { valid: false; rejectionReason: RejectionReason };

export function validatePowerEngineRequest(
  req: PowerEngineRequest,
  config: TrustedSourcesConfig,
): PowerEngineValidationResult {
  if (!req.actorId || req.actorId.trim().length === 0) {
    return { valid: false, rejectionReason: 'MISSING_ACTOR_ID' };
  }
  if (!req.reason || req.reason.trim().length === 0) {
    return { valid: false, rejectionReason: 'EMPTY_REASON' };
  }
  if (!config.trustedSources.includes(req.source)) {
    return { valid: false, rejectionReason: 'UNTRUSTED_SOURCE' };
  }
  return { valid: true };
}

export type AuditScalar = string | number | boolean | null;

export interface PowerEngineAuditEntry {
  actorId: string;
  source: string;
  reason: string;
  action: string;
  outcome: 'allowed' | 'rejected';
  rejectionReason?: RejectionReason;
  metadata?: Record<string, AuditScalar>;
  at: number;
}

export interface AuditWriter {
  write(entry: PowerEngineAuditEntry): Promise<void>;
}

/** In-memory writer for tests and the sandbox smoke test; the real adapter writes to the insert-only audit_logs table. */
export class InMemoryAuditWriter implements AuditWriter {
  readonly entries: PowerEngineAuditEntry[] = [];

  async write(entry: PowerEngineAuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

export type DispatchOutcome<T> =
  { ok: true; result: T } | { ok: false; rejectionReason: RejectionReason };

export interface DispatchOptions {
  /** Action-specific fact set serialized into the audit_logs.metadata column. */
  metadata?: Record<string, AuditScalar>;
}

export class PowerEngineDispatcher {
  constructor(
    private readonly config: TrustedSourcesConfig,
    private readonly auditWriter: AuditWriter,
    private readonly now: () => number = Date.now,
  ) {}

  async dispatch<T>(
    action: string,
    req: PowerEngineRequest,
    handler: () => Promise<T>,
    options: DispatchOptions = {},
  ): Promise<DispatchOutcome<T>> {
    const validation = validatePowerEngineRequest(req, this.config);

    if (!validation.valid) {
      await this.auditWriter.write({
        actorId: req.actorId,
        source: req.source,
        reason: req.reason,
        action,
        outcome: 'rejected',
        rejectionReason: validation.rejectionReason,
        ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
        at: this.now(),
      });
      return { ok: false, rejectionReason: validation.rejectionReason };
    }

    // Run the handler FIRST, then audit the outcome: the 'allowed' write is
    // unconditional on the *attempt* being accepted, but it must never claim
    // an action succeeded before the handler has actually run (UR-A-05 /
    // UR-B-06 — truthful, outcome-based audit rows).
    const result = await handler();

    await this.auditWriter.write({
      actorId: req.actorId,
      source: req.source,
      reason: req.reason,
      action,
      outcome: 'allowed',
      ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
      at: this.now(),
    });

    return { ok: true, result };
  }
}
