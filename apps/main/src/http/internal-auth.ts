import { createHash } from 'node:crypto';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { constantTimeEqual, generateToken } from '../shared/utils/crypto.js';

export const INTERNAL_API_HEADER = 'x-internal-api-key';

export interface InternalPreHandlerOptions {
  expectedKey: string;
  onFailStatus?: number;
  failMessage?: string;
  /**
   * Restricts the gate to a subset of routes. Returning true runs the key
   * check; returning false lets the request through untouched. Omit to gate
   * every route on the instance.
   */
  shouldProtect?: (request: FastifyRequest) => boolean;
  audit?: (outcome: 'allowed' | 'rejected', detail: Record<string, string>) => Promise<void> | void;
}

export function registerInternalAuth(
  app: FastifyInstance,
  options: InternalPreHandlerOptions,
): void {
  const expected = options.expectedKey;
  const onFailStatus = options.onFailStatus ?? 401;
  const failMessage = options.failMessage ?? 'missing or invalid x-internal-api-key';
  const shouldProtect = options.shouldProtect;
  const audit = options.audit;

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (shouldProtect && !shouldProtect(request)) return;
    const provided = request.headers[INTERNAL_API_HEADER];
    const supplied =
      typeof provided === 'string' ? provided : Array.isArray(provided) ? provided[0] : undefined;
    if (!supplied || !constantTimeEqual(supplied, expected)) {
      const detail = {
        path: request.url,
        method: request.method,
        sourceIp: request.ip,
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

export function fingerprintKey(key: string | undefined): string {
  if (!key) return '(none)';
  const d = createHash('sha256').update(key).digest('hex');
  return d.slice(0, 8);
}

/**
 * Swastik's route policy, kept here rather than inside the entry point so it is a pure,
 * importable, testable function. `src/entry/swastik.ts` executes side effects at module scope
 * and cannot be imported by a unit test, so a policy expressed there would be untestable.
 *
 * Fail-closed by construction: every route is protected unless it appears in the developer
 * exemption list below, so a route added to Swastik later is authenticated unless somebody
 * deliberately decides otherwise.
 */
const SWASTIK_DEVELOPER_EXEMPT_ROUTES: readonly (readonly [string, RegExp])[] = [
  // Developer self-service, authenticated by the caller's own bearer credential, not the
  // service-to-service key. See UR-B-05 for the separate defect that devId is a plaintext token.
  ['GET', /^\/swastik\/developers\/me$/],
  ['POST', /^\/swastik\/modules\/upload$/],
  ['GET', /^\/swastik\/modules\/[^/]+\/builds\/[^/]+$/],
];

/**
 * True when a Swastik request must present the internal service key.
 *
 * Protected: all `/internal/*`, plus `POST /swastik/developers/register` and
 * `GET /swastik/status` — the two routes that had no gate at all.
 */
export function shouldProtectSwastikRoute(request: { method: string; url: string }): boolean {
  const { method, url } = request;
  const path = url.split('?')[0] ?? url;
  const isExempt = SWASTIK_DEVELOPER_EXEMPT_ROUTES.some(
    ([exemptMethod, pattern]) => exemptMethod === method && pattern.test(path),
  );
  return !isExempt;
}

export { constantTimeEqual, generateToken };
