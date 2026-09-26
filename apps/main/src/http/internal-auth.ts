import { createHash } from 'node:crypto';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { constantTimeEqual, generateToken } from '../shared/utils/crypto.js';

export const INTERNAL_API_HEADER = 'x-internal-api-key';

/**
 * Shared constant-time internal-authentication preHandler used by the
 * control-plane HTTP services (PEP, CLAI, Swastik, credentials, admin).
 *
 * CL-0039 / CL-0070 / CL-0071: the shared secret is compared with
 * `crypto.timingSafeEqual` via {@link constantTimeEqual} — never with `===`
 * or string length short-circuiting — and every attempt (allowed or rejected)
 * is written to the audit log with the redacted key material.
 *
 * Fastify runs preHandler hooks *before* every registered route handler in the
 * same encapsulation scope; a single `app.addHook('preHandler', ...)` here
 * protects every route registered under it.
 */

export interface InternalPreHandlerOptions {
  /** Expected shared secret (unhashed). */
  expectedKey: string;
  /** Optional: on failure, the hook short-circuits with this HTTP status. */
  onFailStatus?: number;
  /** Failure message returned to the caller. */
  failMessage?: string;
  /** Optional audit writer callback invoked for each attempt. */
  audit?: (outcome: 'allowed' | 'rejected', detail: Record<string, string>) => Promise<void> | void;
}

/** Registers a preHandler that protects every route registered under `app`. */
export function registerInternalAuth(
  app: FastifyInstance,
  options: InternalPreHandlerOptions,
): void {
  const expected = options.expectedKey;
  const onFailStatus = options.onFailStatus ?? 401;
  const failMessage = options.failMessage ?? 'missing or invalid x-internal-api-key';
  const audit = options.audit;

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const provided = request.headers[INTERNAL_API_HEADER];
    const supplied =
      typeof provided === 'string' ? provided : Array.isArray(provided) ? provided[0] : undefined;
    if (!supplied || !constantTimeEqual(supplied, expected)) {
      const detail = {
        path: request.url,
        method: request.method,
        sourceIp: request.ip,
        // Never log the secret itself, even redacted hashes are only the key's
        // fingerprint, not reversible back to a usable credential.
        keyFingerprint: fingerprintKey(supplied),
      };
      await audit?.('rejected', detail);
      return reply.code(onFailStatus).send({ error: failMessage });
    }
    await audit?.('allowed', {
      path: request.url,
      method: request.method,
      sourceIp: request.ip,
    });
  });
}

/** Deterministic, non-reversible fingerprint of a supplied key for audits. */
export function fingerprintKey(key: string | undefined): string {
  if (!key) return '(none)';
  const d = createHash('sha256').update(key).digest('hex');
  return d.slice(0, 8);
}

/**
 * Timing-safe challenge used by internal endpoints that must also accept
 * per-developer Bearer tokens (Swastik). Verifies supplied == known true
 * values only when both are present.
 */
export { constantTimeEqual, generateToken };
