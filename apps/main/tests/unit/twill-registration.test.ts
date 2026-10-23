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

// UR-20261012-089 — these fixtures must be well-formed Discord identifiers now, so they are built
// rather than typed: the token's first segment is base64 of the application id, exactly as Discord
// mints it. A synthetic token, never a real one.
const APP_ID = '1387991780934553600';
const GUILD_ID = '1062427177326497863';
const REGISTRAR_ID = '463269847023288331';
const BOT_TOKEN = `${Buffer.from(APP_ID, 'utf8')
  .toString('base64')
  .replace(/=+$/, '')}.GpIvHE.${'a'.repeat(38)}`;
const CLIENT_SECRET = '0123456789abcdef0123456789abcdef'; // gitleaks:allow — synthetic test fixture

const body = {
  name: 'Nova',
  discordApplicationId: APP_ID,
  boundGuildId: GUILD_ID,
  botToken: BOT_TOKEN,
  // UR-20261021-095 — required now, exactly as the bot token and the application id are.
  oauthClientSecret: CLIENT_SECRET,
  registrarAuthority: REGISTRAR_ID,
};

describe('parsePersonaRegistration', () => {
  test('seals the bot token and derives its digest', () => {
    const parsed = parsePersonaRegistration(body, rootKey);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.name).toBe('Nova');
    expect(parsed.input.botTokenDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(openSealedText(parsed.input.botTokenSealed, rootKey)).toBe(BOT_TOKEN);
    // UR-20261021-095 — the client secret is required, so it is always sealed here.
    expect(parsed.input.oauthClientSecretSealed).toBeDefined();
  });

  test('seals the OAuth client secret when one is supplied', () => {
    const parsed = parsePersonaRegistration({ ...body, oauthClientSecret: CLIENT_SECRET }, rootKey);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.oauthClientSecretSealed).toBeDefined();
    expect(openSealedText(parsed.input.oauthClientSecretSealed!, rootKey)).toBe(CLIENT_SECRET);
  });

  test('rejects a body missing a required field, naming it', () => {
    for (const field of [
      'name',
      'discordApplicationId',
      'boundGuildId',
      'botToken',
      'oauthClientSecret',
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
    const parsed = parsePersonaRegistration({ ...body, oauthClientSecret: CLIENT_SECRET }, rootKey);
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
    expect(flat).not.toContain(BOT_TOKEN);
    expect(flat).not.toContain(CLIENT_SECRET);
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
      discordApplicationId: APP_ID,
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
    rotatePersonaCredentials: vi.fn(async (id: string) => ({
      id,
      name: 'Nova',
      discordApplicationId: APP_ID,
      boundGuildId: GUILD_ID,
      dmBehavior: 'prohibited',
      shardAllocation: 1,
      charter: 'free',
      grandfathered: false,
      status: 'active',
      botTokenDigest: 'd',
      botTokenSealed: { ciphertext: 'x' },
      oauthClientSecretSealed: { ciphertext: 'y' },
    })),
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
      json: async () => ({ id: APP_ID }),
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
    expect(res.body).not.toContain(BOT_TOKEN);
    expect(service.registerPersona).toHaveBeenCalledTimes(1);
    // The registrar attestation is RECORDED in the message (the viewer drops structured fields).
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(`authority=${REGISTRAR_ID}`));
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
    service.registerPersona.mockRejectedValueOnce(new ApplicationAlreadyRegisteredError(APP_ID));
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/register',
      payload: body,
    });
    expect(res.statusCode).toBe(409);
  });

  test('POST /credentials requires oauthClientSecret (UR-20261021-095)', async () => {
    const { app, service } = buildRoutes();
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/credentials',
      payload: { botToken: BOT_TOKEN },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().reason).toContain('oauthClientSecret');
    expect(service.rotatePersonaCredentials).not.toHaveBeenCalled();
  });

  test('POST /credentials rotates when the secret is supplied', async () => {
    const { app, service } = buildRoutes();
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/credentials',
      payload: { oauthClientSecret: CLIENT_SECRET },
    });
    expect(res.statusCode).toBe(200);
    expect(service.rotatePersonaCredentials).toHaveBeenCalledTimes(1);
  });

  test('GET detail is 404 for an unknown persona and 200 for a known one', async () => {
    const { app, identities } = buildRoutes();
    const missing = await app.inject({ method: 'GET', url: '/twill/personas/persona-1' });
    expect(missing.statusCode).toBe(404);

    identities.findById.mockResolvedValueOnce({
      id: 'persona-1',
      name: 'Nova',
      discordApplicationId: APP_ID,
      boundGuildId: GUILD_ID,
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

  test('a binding for a DISABLED module is refused by name (UR-20261012-052)', async () => {
    // The bind itself does not need the module enabled, and neither does the deploy — so binding a
    // disabled module SUCCEEDED, the command was registered, and every invocation was then refused at
    // dispatch ("not available in guild"). A visible-but-dead command reads as a broken persona.
    const { app, service } = buildRoutes({ isModuleEnabledInGuild: async () => false });
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: GUILD_ID, moduleSlug: 'hello-world' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().reason).toContain('hello-world');
    expect(res.json().reason).toContain('not enabled');
    expect(service.bindModuleToPersona).not.toHaveBeenCalled();
  });

  test('an enabled module binds as before', async () => {
    const { app, service } = buildRoutes({ isModuleEnabledInGuild: async () => true });
    const res = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: GUILD_ID, moduleSlug: 'hello-world' },
    });
    expect(res.statusCode).toBe(201);
    expect(service.bindModuleToPersona).toHaveBeenCalledTimes(1);
  });

  test('POST bindings requires both fields and binds otherwise', async () => {
    const { app, service } = buildRoutes();
    const bad = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: GUILD_ID },
    });
    expect(bad.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'POST',
      url: '/twill/personas/persona-1/bindings',
      payload: { guildId: GUILD_ID, moduleSlug: 'hello-world' },
    });
    expect(ok.statusCode).toBe(201);
    expect(service.bindModuleToPersona).toHaveBeenCalledWith({
      guildId: GUILD_ID,
      moduleSlug: 'hello-world',
      personaId: 'persona-1',
    });
  });

  test('DELETE a binding is 404 when unknown and 204 when removed', async () => {
    const { app, identities, bindings, service } = buildRoutes();
    const persona = {
      id: 'persona-1',
      name: 'Nova',
      discordApplicationId: APP_ID,
      boundGuildId: GUILD_ID,
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
      guildId: GUILD_ID,
      moduleSlug: 'hello-world',
      personaId: 'persona-1',
    });
    const removed = await app.inject({
      method: 'DELETE',
      url: '/twill/personas/persona-1/bindings/hello-world',
    });
    expect(removed.statusCode).toBe(204);
    expect(service.unbindModule).toHaveBeenCalledWith(GUILD_ID, 'hello-world');
  });
});

describe('a Twill unbind runs the WHOLE disable chain', () => {
  const personaRow = {
    id: 'p-1',
    name: 'Magma',
    discordApplicationId: APP_ID,
    boundGuildId: GUILD_ID,
    botTokenSealed: { ciphertext: 'x' },
    status: 'active',
  };

  test('it calls the HOST uninstall — state, claim, commands and runtime — not just the claim', async () => {
    // Releasing the binding alone left the state enabled, her commands registered in the guild with
    // her own token, and her runtime still serving them. The in-app uninstall runs the whole chain,
    // so this route calls it rather than repeating it.
    const uninstallModule = vi.fn(async () => undefined);
    const { app, service } = buildRoutes({
      uninstallModule,
      identities: {
        findById: vi.fn(async () => personaRow),
        list: vi.fn(async () => [personaRow]),
      },
      bindings: { findLive: vi.fn(async () => ({ personaId: 'p-1', moduleSlug: 'hello-world' })) },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/twill/personas/p-1/bindings/hello-world',
    });

    expect(res.statusCode).toBe(204);
    expect(uninstallModule).toHaveBeenCalledWith('hello-world', GUILD_ID, 'twill', APP_ID);
    // and it does NOT merely release the claim
    expect(
      (service as unknown as { unbindModule: () => unknown }).unbindModule,
    ).not.toHaveBeenCalled();
  });

  test('with no host uninstall wired, it still releases the claim rather than doing nothing', async () => {
    const { app, service } = buildRoutes({
      identities: {
        findById: vi.fn(async () => personaRow),
        list: vi.fn(async () => [personaRow]),
      },
      bindings: { findLive: vi.fn(async () => ({ personaId: 'p-1', moduleSlug: 'hello-world' })) },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: '/twill/personas/p-1/bindings/hello-world',
    });
    expect(res.statusCode).toBe(204);
    expect((service as unknown as { unbindModule: () => unknown }).unbindModule).toHaveBeenCalled();
  });
});
