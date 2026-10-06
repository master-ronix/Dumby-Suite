import { randomUUID } from 'node:crypto';
import { INTERNAL_API_HEADER } from './internal-auth.js';
import type { Logger } from '../logging/logger.js';

/**
 * blueprint.md §22.7 — "Every command a CLAI session issues executes against the real Power Engine
 * route: the dispatch bridge presents a Credentials-Service-issued service-to-service credential
 * (`purpose: 'service_to_service'`, §22.8) on each call, so CLAI's privilege over Power Engine is
 * an issued credential, never a network position or an asserted identity. Each command mints a
 * correlation ID that travels on the Power Engine call and is written into both the CLAI session's
 * audit row and the Power Engine handler's audit row, so a terminal intervention and the
 * control-plane change it caused join on a single `correlationId`."
 *
 * Before this the CLAI injected a handler that always threw, so no terminal command could reach the
 * control plane at all.
 */
export const CORRELATION_ID_HEADER = 'x-dumby-correlation-id';
export const SERVICE_CREDENTIAL_HEADER = 'x-dumby-service-credential';

export interface PowerEngineClientOptions {
  readonly baseUrl: string;
  readonly internalApiKey: string;
  /** §22.8 — the issued `service_to_service` credential, presented on every call. */
  readonly serviceCredential: string;
  readonly logger: Logger;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface PowerEngineCallResult {
  readonly ok: boolean;
  readonly status: number;
  readonly body: unknown;
}

export class PowerEngineClient {
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: PowerEngineClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  /** §22.7 — every command mints the id that joins the two audit rows. */
  newCorrelationId(): string {
    return randomUUID();
  }

  async call(
    functionName: string,
    args: Record<string, unknown>,
    caller: { actorId: string; reason: string; correlationId: string },
  ): Promise<PowerEngineCallResult> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/admin/power-engine/${encodeURIComponent(functionName)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [INTERNAL_API_HEADER]: this.options.internalApiKey,
          [SERVICE_CREDENTIAL_HEADER]: this.options.serviceCredential,
          [CORRELATION_ID_HEADER]: caller.correlationId,
        },
        body: JSON.stringify({ ...args, actorId: caller.actorId, reason: caller.reason }),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, body };
    } catch (err) {
      this.options.logger.error('power-engine-call-failed', {
        function: functionName,
        correlationId: caller.correlationId,
        error: String(err),
      });
      return { ok: false, status: 0, body: { error: String(err) } };
    } finally {
      clearTimeout(timer);
    }
  }
}
