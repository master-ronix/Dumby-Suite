/**
 * PowerEngineDispatcher (Cluster: Boot). Every mutating
 * /admin/* and /admin/power-engine/* endpoint routes through this instead
 * of touching its target service directly. Three invariants, all
 * unconditional:
 *
 *   1. actorId, source, and reason are required on every call.
 *   2. An empty reason or an untrusted source is rejected outright.
 *   3. An audit_logs row is written for EVERY attempt — allowed or
 *      rejected — never only on success.
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

export interface PowerEngineAuditEntry {
  actorId: string;
  source: string;
  reason: string;
  action: string;
  outcome: 'allowed' | 'rejected';
  rejectionReason?: RejectionReason;
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
        at: this.now(),
      });
      return { ok: false, rejectionReason: validation.rejectionReason };
    }

    // Audit the allowed attempt BEFORE running the handler: the write is
    // unconditional on the *attempt*, not on the handler's own success.
    await this.auditWriter.write({
      actorId: req.actorId,
      source: req.source,
      reason: req.reason,
      action,
      outcome: 'allowed',
      at: this.now(),
    });

    const result = await handler();
    return { ok: true, result };
  }
}
