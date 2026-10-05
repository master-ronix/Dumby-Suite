import type { PowerEngineFunction, PowerEngineContext } from './power-engine-catalog.js';

export interface PowerEngineRequest {
  actorId: string;
  source: string;
  reason: string;
  /** §22.7 — travels on the call and is written into the audit row, so a CLAI intervention and the
   * control-plane change it caused join on a single id. */
  correlationId?: string;
}

export interface TrustedSourcesConfig {
  trustedSources: readonly string[];
}

export type RejectionReason =
  'MISSING_ACTOR_ID' | 'EMPTY_REASON' | 'UNTRUSTED_SOURCE' | 'UNKNOWN_FUNCTION';

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
  outcome: 'allowed' | 'rejected' | 'failed';
  rejectionReason?: RejectionReason;
  /** §22.6 — the true outcome of a handler that threw is recorded, not lost. */
  failureReason?: string;
  correlationId?: string;
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

    const result = await this.runHandler(action, req, handler, options);

    return { ok: true, result };
  }

  /**
   * §22.6 — "Every invocation writes an unconditional `audit_logs` entry after its domain handler
   * completes, recording the true outcome." A handler that threw previously escaped with no row at
   * all; it now audits `failed` with its reason and rethrows.
   */
  private async runHandler<T>(
    action: string,
    req: PowerEngineRequest,
    handler: () => Promise<T>,
    options: DispatchOptions,
  ): Promise<T> {
    const base = {
      actorId: req.actorId,
      source: req.source,
      reason: req.reason,
      action,
      ...(req.correlationId !== undefined ? { correlationId: req.correlationId } : {}),
      ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
    };
    try {
      const result = await handler();
      await this.auditWriter.write({ ...base, outcome: 'allowed', at: this.now() });
      return result;
    } catch (err) {
      await this.auditWriter.write({
        ...base,
        outcome: 'failed',
        failureReason: String(err),
        at: this.now(),
      });
      throw err;
    }
  }

  /**
   * The catalog-driven path both surfaces use (§22.6/§22.7): resolve the function by name, run its
   * declared handler, and audit the true outcome. An unknown name is rejected and audited.
   */
  async dispatchFunction(
    name: string,
    args: Record<string, unknown>,
    req: PowerEngineRequest,
    catalog: ReadonlyMap<string, PowerEngineFunction>,
  ): Promise<DispatchOutcome<{ summary: string; data?: Record<string, unknown> }>> {
    // The same gate `dispatch` applies — the catalog path must not bypass the trusted-source,
    // actor and reason validation, or an untrusted caller could drive a control action.
    const validation = validatePowerEngineRequest(req, this.config);
    if (!validation.valid) {
      await this.auditWriter.write({
        actorId: req.actorId,
        source: req.source,
        reason: req.reason,
        action: name,
        outcome: 'rejected',
        rejectionReason: validation.rejectionReason,
        ...(req.correlationId !== undefined ? { correlationId: req.correlationId } : {}),
        at: this.now(),
      });
      return { ok: false, rejectionReason: validation.rejectionReason };
    }

    const fn = catalog.get(name);
    if (fn === undefined) {
      await this.auditWriter.write({
        actorId: req.actorId,
        source: req.source,
        reason: req.reason,
        action: name,
        outcome: 'rejected',
        rejectionReason: 'UNKNOWN_FUNCTION',
        ...(req.correlationId !== undefined ? { correlationId: req.correlationId } : {}),
        at: this.now(),
      });
      return { ok: false, rejectionReason: 'UNKNOWN_FUNCTION' };
    }
    const ctx: PowerEngineContext = {
      actorId: req.actorId,
      source: req.source,
      reason: req.reason,
      correlationId: req.correlationId ?? '',
      now: this.now,
    };
    const result = await this.runHandler(name, req, () => fn.handler(args, ctx), {});
    return { ok: true, result };
  }
}
