import { createHash } from 'node:crypto';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { constantTimeEqual, generateToken } from '../shared/utils/crypto.js';

export const INTERNAL_API_HEADER = 'x-internal-api-key';

export interface InternalPreHandlerOptions {
  expectedKey: string;
  onFailStatus?: number;
  failMessage?: string;
  audit?: (outcome: 'allowed' | 'rejected', detail: Record<string, string>) => Promise<void> | void;
}

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

export { constantTimeEqual, generateToken };
