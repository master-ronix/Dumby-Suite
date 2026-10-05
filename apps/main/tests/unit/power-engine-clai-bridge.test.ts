import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import {
  CORRELATION_ID_HEADER,
  PowerEngineClient,
  SERVICE_CREDENTIAL_HEADER,
} from '../../src/http/power-engine-client.js';
import { INTERNAL_API_HEADER } from '../../src/http/internal-auth.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §22.7 — "Every command a CLAI session issues executes against the real Power Engine route: the
 * dispatch bridge presents a Credentials-Service-issued service-to-service credential on each call,
 * so CLAI's privilege over Power Engine is an issued credential, never a network position or an
 * asserted identity. Each command mints a correlation ID that travels on the Power Engine call and
 * is written into both the CLAI session's audit row and the Power Engine handler's audit row."
 *
 * Before this the CLAI injected a local handler that always threw, so no terminal command reached
 * the control plane at all.
 */
const logger = createLogger('error');
const config = {
  baseUrl: 'http://127.0.0.1:8080',
  internalApiKey: 'internal-key',
  serviceCredential: 'svc-credential',
  logger,
};

describe('CLAI -> Power Engine route bridge (§22.7)', () => {
  test('a command posts to the real route with the internal key, the service credential and the correlation id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const client = new PowerEngineClient({ ...config, fetchImpl: fetchImpl as never });
    const correlationId = client.newCorrelationId();

    const result = await client.call(
      'suspendGuild',
      { guildId: 'g1', reason: 'abuse', confirm: true },
      { actorId: 'op-1', reason: 'abuse', correlationId },
    );

    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('http://127.0.0.1:8080/admin/power-engine/suspendGuild');
    const headers = (init as { headers: Record<string, string> }).headers;
    expect(headers[INTERNAL_API_HEADER]).toBe('internal-key');
    expect(headers[SERVICE_CREDENTIAL_HEADER]).toBe('svc-credential');
    expect(headers[CORRELATION_ID_HEADER]).toBe(correlationId);
    const body = JSON.parse((init as { body: string }).body) as Record<string, unknown>;
    expect(body['guildId']).toBe('g1');
    expect(body['actorId']).toBe('op-1');
  });

  test('every command mints a fresh correlation id', () => {
    const client = new PowerEngineClient(config);
    expect(client.newCorrelationId()).not.toBe(client.newCorrelationId());
  });

  test('a transport failure is reported, not thrown', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new PowerEngineClient({ ...config, fetchImpl: fetchImpl as never });

    const result = await client.call('suspendGuild', {}, {
      actorId: 'op-1',
      reason: 'r',
      correlationId: 'c1',
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
  });

  test('the CLAI parses the command by the prefix length, not a hardcoded offset', () => {
    // The PEP -> Power Engine rename changed the prefix from 4 characters to 13 but left a
    // `slice(4)`, so every terminal command looked up a function named "r-engine". This guards it.
    const src = readFileSync(
      fileURLToPath(new URL('../../src/entry/ssh-clai.ts', import.meta.url)),
      'utf8',
    );
    expect(src).toContain('const rest = line.slice(POWER_ENGINE_COMMAND_PREFIX.length).trim();');
    expect(src).not.toMatch(/line\.slice\(4\)/);
    expect(src).toContain("export const POWER_ENGINE_COMMAND_PREFIX = 'power-engine ';");
  });

  test('the route threads the correlation id into the handler request', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../../src/http/routes/admin.routes.ts', import.meta.url)),
      'utf8',
    );
    expect(src).toContain('CORRELATION_ID_HEADER');
    expect(src).toMatch(/correlationId/);
  });
});
