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

export class InMemoryAuditWriter implements AuditWriter {
  readonly entries: PowerEngineAuditEntry[] = [];

  async write(entry: PowerEngineAuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}

export type DispatchOutcome<T> =
  { ok: true; result: T } | { ok: false; rejectionReason: RejectionReason };

export interface DispatchOptions {
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
