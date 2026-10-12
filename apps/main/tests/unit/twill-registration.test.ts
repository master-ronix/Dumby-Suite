import { describe, expect, test, vi } from 'vitest';
import Fastify from 'fastify';
import { randomRootKey } from '../../src/crypto/envelope.js';
import { openSealedText } from '../../src/personas/persona-credentials.js';
import {
  parsePersonaRegistration,
  publicPersonaView,
  registerTwillPersonaRoutes,
} from '../../src/personas/twill-registration.js';
import {
  ApplicationAlreadyRegisteredError,
  type PersonaIdentity,
} from '../../src/personas/persona.js';

const rootKey = randomRootKey('local');

const body = {
  name: 'Nova',
  discordApplicationId: 'app-9',
  boundGuildId: 'g1',
  botToken: 'bot-secret',
  registrarAuthority: 'owner-of-app-9',
};

describe('parsePersonaRegistration', () => {
  test('seals the bot token and derives its digest', () => {
    const parsed = parsePersonaRegistration(body, rootKey);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.name).toBe('Nova');
    expect(parsed.input.botTokenDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(openSealedText(parsed.input.botTokenSealed, rootKey)).toBe('bot-secret');
    // no client secret supplied => no Route A credential
    expect(parsed.input.oauthClientSecretSealed).toBeUndefined();
  });

  test('seals the OAuth client secret when one is supplied', () => {
    const parsed = parsePersonaRegistration(
      { ...body, oauthClientSecret: 'oauth-secret' },
      rootKey,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.oauthClientSecretSealed).toBeDefined();
    expect(openSealedText(parsed.input.oauthClientSecretSealed!, rootKey)).toBe('oauth-secret');
  });

  test('rejects a body missing a required field, naming it', () => {
    for (const field of [
      'name',
      'discordApplicationId',
      'boundGuildId',
      'botToken',
      'registrarAuthority',
    ]) {
      const partial: Record<string, unknown> = { ...body };
      delete partial[field];
      const parsed = parsePersonaRegistration(partial, rootKey);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.reason).toContain(field);
    }
  });

  test('defaults dmBehaviour to prohibited and only honours an explicit allowed', () => {
    const def = parsePersonaRegistration(body, rootKey);
    const allowed = parsePersonaRegistration({ ...body, dmBehavior: 'allowed' }, rootKey);
    const junk = parsePersonaRegistration({ ...body, dmBehavior: 'maybe' }, rootKey);
    expect(def.ok && def.input.dmBehavior).toBe('prohibited');
    expect(allowed.ok && allowed.input.dmBehavior).toBe('allowed');
    expect(junk.ok && junk.input.dmBehavior).toBe('prohibited');
  });
});

describe('publicPersonaView', () => {
  test('never discloses a sealed credential or its digest', () => {
    const parsed = parsePersonaRegistration(
      { ...body, oauthClientSecret: 'oauth-secret' },
      rootKey,
    );
    if (!parsed.ok) throw new Error('fixture');
    const persona: PersonaIdentity = {
      id: 'persona-1',
      name: parsed.input.name,
      discordApplicationId: parsed.input.discordApplicationId,
      boundGuildId: parsed.input.boundGuildId,
      dmBehavior: parsed.input.dmBehavior ?? 'prohibited',
      shardAllocation: 1,
      charter: 'free',
      grandfathered: false,
      status: 'active',
      botTokenDigest: parsed.input.botTokenDigest,
      botTokenSealed: parsed.input.botTokenSealed,
      ...(parsed.input.oauthClientSecretSealed !== undefined
        ? { oauthClientSecretSealed: parsed.input.oauthClientSecretSealed }
        : {}),
    };
    const view = publicPersonaView(persona);
    const flat = JSON.stringify(view);
    expect(flat).not.toContain('bot-secret');
    expect(flat).not.toContain('oauth-secret');
    expect(flat).not.toContain(parsed.input.botTokenDigest);
    expect(view['oauthConfigured']).toBe(true);
  });
});

function buildRoutes(overrides: Record<string, unknown> = {}) {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const service = {
    registerPersona: vi.fn(async (input: { name: string; boundGuildId: string }) => ({
      id: 'persona-1',
      name: input.name,
      discordApplicationId: 'app-9',
      boundGuildId: input.boundGuildId,
      dmBehavior: 'prohibited',
      shardAllocation: 1,
      charter: 'free',
      grandfathered: false,
      status: 'active',
      botTokenDigest: 'd',
      botTokenSealed: { ciphertext: 'x' },
    })),
    bindModuleToPersona: vi.fn(async (r: unknown) => r),
    unbindModule: vi.fn(async () => undefined),
  };
  const identities = { findById: vi.fn(async () => undefined), list: vi.fn(async () => []) };
  const bindings = { findLive: vi.fn(async () => undefined) };
  const app = Fastify();
  registerTwillPersonaRoutes(app, {
    service: service as never,
    identities: identities as never,
    bindings: bindings as never,
    rootKey,
    logger: logger as never,
    costSignals: { dedicatedInfrastructureRequired: false, perPersonaCostMeasurable: false },
    // UR-20261012-041 — the ownership proof is a real Discord call. Stub it to confirm the token
    // belongs to the claimed application, or every register test gets the 403 the gate returns.
    ownershipFetch: vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'app-9' }),
    })),
    ...overrides,
  } as never);
  return { app, service, identities, bindings, logger };
}

describe('twill persona routes', () => {
  test('POST /twill/personas/register creates a persona and returns identity only', async () => {
    const { app, service, logger } = buildRoutes();
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/register',
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().name).toBe('Nova');
    expect(res.body).not.toContain('bot-secret');
    expect(service.registerPersona).toHaveBeenCalledTimes(1);
    // The registrar attestation is RECORDED in the message (the viewer drops structured fields).
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('authority=owner-of-app-9'));
  });

  test('POST rejects an incomplete body with 400 and a named reason', async () => {
    const { app, service } = buildRoutes();
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/register',
      payload: { name: 'Nova' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().reason).toContain('discordApplicationId');
    expect(service.registerPersona).not.toHaveBeenCalled();
  });

  test('POST maps a duplicate application to 409', async () => {
    const { app, service } = buildRoutes();
    service.registerPersona.mockRejectedValueOnce(new ApplicationAlreadyRegisteredError('app-9'));
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/register',
      payload: body,
    });
    expect(res.statusCode).toBe(409);
  });

  test('GET detail is 404 for an unknown persona and 200 for a known one', async () => {
    const { app, identities } = buildRoutes();
    const missing = await app.inject({ method: 'GET', url: '/twill/personas/persona-1' });
    expect(missing.statusCode).toBe(404);

    identities.findById.mockResolvedValueOnce({
      id: 'persona-1',
      name: 'Nova',
      discordApplicationId: 'app-9',
      boundGuildId: 'g1',
      dmBehavior: 'prohibited',
      shardAllocation: 1,
      charter: 'free',
      grandfathered: false,
      status: 'active',
      botTokenDigest: 'd',
      botTokenSealed: { ciphertext: 'x' },
    });
    const found = await app.inject({ method: 'GET', url: '/twill/personas/persona-1' });
    expect(found.statusCode).toBe(200);
    expect(found.json().oauthConfigured).toBe(false);
  });

  test('POST bindings requires both fields and binds otherwise', async () => {
    const { app, service } = buildRoutes();
    const bad = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: 'g1' },
    });
    expect(bad.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: 'g1', moduleSlug: 'hello-world' },
    });
    expect(ok.statusCode).toBe(201);
    expect(service.bindModuleToPersona).toHaveBeenCalledWith({
      guildId: 'g1',
      moduleSlug: 'hello-world',
      personaId: 'persona-1',
    });
  });

  test('DELETE a binding is 404 when unknown and 204 when removed', async () => {
    const { app, identities, bindings, service } = buildRoutes();
    const persona = {
      id: 'persona-1',
      name: 'Nova',
      discordApplicationId: 'app-9',
      boundGuildId: 'g1',
      dmBehavior: 'prohibited',
      shardAllocation: 1,
      charter: 'free',
      grandfathered: false,
      status: 'active',
      botTokenDigest: 'd',
      botTokenSealed: { ciphertext: 'x' },
    };
    identities.findById.mockResolvedValue(persona);
    const missing = await app.inject({
      method: 'DELETE',
      url: '/twill/personas/persona-1/bindings/hello-world',
    });
    expect(missing.statusCode).toBe(404);

    bindings.findLive.mockResolvedValueOnce({
      guildId: 'g1',
      moduleSlug: 'hello-world',
      personaId: 'persona-1',
    });
    const removed = await app.inject({
      method: 'DELETE',
      url: '/twill/personas/persona-1/bindings/hello-world',
    });
    expect(removed.statusCode).toBe(204);
    expect(service.unbindModule).toHaveBeenCalledWith('g1', 'hello-world');
  });
});
