import { test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { registerOAuthRoutes } from '../../src/http/routes/oauth.routes.js';

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never;

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    authorizeUrl: vi.fn((state: string) => `https://discord.com/oauth2/authorize?state=${state}`),
    exchangeCode: vi.fn(async () => ({
      accessToken: 'access',
      tokenType: 'Bearer',
      expiresIn: 604800,
      refreshToken: 'refresh',
    })),
    fetchUser: vi.fn(async () => ({ id: 'u1', username: 'bob' })),
    fetchGuilds: vi.fn(async () => [{ id: 'g1', permissions: '32' }]),
    ...overrides,
  } as never;
}

function makeTokens(status = 'active') {
  return {
    connect: vi.fn(async () => {}),
    status: vi.fn(async () => status),
    resolveAccessToken: vi.fn(async () => undefined),
    refreshDue: vi.fn(async () => ({ refreshed: 0, revoked: 0 })),
  } as never;
}

function build(client: unknown, tokens: unknown) {
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: client as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    tokens: tokens as never,
  });
  return app;
}

const OK_COOKIE = 'dumby_oauth_state=S; dumby_oauth_guild=g1';

test('GET /dashboard is one purpose and one control — no guild list', async () => {
  const res = await build(makeClient(), makeTokens('active')).inject({
    method: 'GET',
    url: '/dashboard',
  });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('/auth/authorize?bot=1');
  expect(res.body).toContain("Discord's own screen");
  // the former guild list and per-guild Authorize controls are gone
  expect(res.body).not.toContain('Authorize</a> <strong>');
});

test('GET /auth/authorize?bot=1 carries the install permission bitfield', async () => {
  const client = makeClient();
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: client as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    installPermissions: '84992',
    tokens: makeTokens() as never,
  });
  await app.inject({ method: 'GET', url: '/auth/authorize?bot=1' });
  const args = (client as { authorizeUrl: { mock: { calls: unknown[][] } } }).authorizeUrl.mock
    .calls[0]!;
  // The guild-less install — the dashboard's own link — must still carry the bitfield.
  expect(args[2]).toEqual({ permissions: '84992' });

  // And a named guild keeps the picker pinned while still carrying it.
  const pinned = makeClient();
  const pinnedApp = Fastify();
  registerOAuthRoutes(pinnedApp, {
    client: pinned as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    installPermissions: '84992',
    tokens: makeTokens() as never,
  });
  await pinnedApp.inject({ method: 'GET', url: '/auth/authorize?bot=1&guild=g2' });
  expect(
    (pinned as { authorizeUrl: { mock: { calls: unknown[][] } } }).authorizeUrl.mock.calls[0]![2],
  ).toEqual({ guildId: 'g2', disableGuildSelect: true, permissions: '84992' });
});

test('GET /auth/authorize mints a state cookie and redirects to Discord', async () => {
  const res = await build(makeClient(), makeTokens()).inject({
    method: 'GET',
    url: '/auth/authorize?guild=g1',
  });
  expect(res.statusCode).toBe(302);
  expect(res.headers.location).toContain('discord.com/oauth2/authorize');
  const cookie = String(res.headers['set-cookie']);
  expect(cookie).toContain('dumby_oauth_state=');
  expect(cookie).toContain('dumby_oauth_guild=g1');
  // Path=/ so the callback leg receives the cookies on both /auth/callback and /oauth/callback.
  expect(cookie).toContain('Path=/');
});

test('GET /auth/callback rejects a mismatched state and a missing code', async () => {
  const badState = await build(makeClient(), makeTokens()).inject({
    method: 'GET',
    url: '/auth/callback?code=c&state=WRONG',
    headers: { cookie: OK_COOKIE },
  });
  expect(badState.statusCode).toBe(400);
  expect(badState.body).toContain('Authorization failed');

  const noCode = await build(makeClient(), makeTokens()).inject({
    method: 'GET',
    url: '/auth/callback?state=S',
    headers: { cookie: OK_COOKIE },
  });
  expect(noCode.statusCode).toBe(400);
  expect(noCode.body).toContain('cancelled');
});

test('GET /auth/callback stores the token set on success', async () => {
  const tokens = makeTokens();
  const res = await build(makeClient(), tokens).inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('Connected');
  expect((tokens as { connect: ReturnType<typeof vi.fn> }).connect).toHaveBeenCalledWith(
    'app1',
    'g1',
    'u1',
    expect.objectContaining({ accessToken: 'access', refreshToken: 'refresh' }),
  );
});

test('GET /auth/callback prefers the guild Discord returns for an install', async () => {
  const tokens = makeTokens();
  const client = makeClient({ fetchGuilds: vi.fn(async () => [{ id: 'g9', permissions: '32' }]) });
  const res = await build(client, tokens).inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S&guild_id=g9',
    headers: { cookie: OK_COOKIE },
  });
  expect(res.statusCode).toBe(200);
  expect((tokens as { connect: ReturnType<typeof vi.fn> }).connect).toHaveBeenCalledWith(
    'app1',
    'g9',
    'u1',
    expect.any(Object),
  );
});

test('GET /oauth/callback is an alias of /auth/callback', async () => {
  const res = await build(makeClient(), makeTokens()).inject({
    method: 'GET',
    url: '/oauth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('Connected');
});

test('GET /auth/callback refuses a user who cannot manage the guild', async () => {
  const client = makeClient({ fetchGuilds: vi.fn(async () => [{ id: 'g1', permissions: '0' }]) });
  const res = await build(client, makeTokens()).inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });
  expect(res.statusCode).toBe(403);
  expect(res.body).toContain('Not permitted');
});

test('GET /auth/callback surfaces a Discord exchange failure', async () => {
  const client = makeClient({
    exchangeCode: vi.fn(async () => {
      throw new Error('boom');
    }),
  });
  const res = await build(client, makeTokens()).inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });
  expect(res.statusCode).toBe(502);
});

// --- UR-20261012-030 (Route A) — per-persona authorization --------------------------------

function buildWithPersonas(personaClients: unknown) {
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: makeClient() as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    tokens: makeTokens() as never,
    personaClients: personaClients as never,
  });
  return app;
}

const personaClient = {
  authorizeUrl: vi.fn(
    (state: string) => `https://discord.com/oauth2/authorize?persona=1&state=${state}`,
  ),
  exchangeCode: vi.fn(async () => ({
    accessToken: 'p-access',
    tokenType: 'Bearer',
    expiresIn: 604800,
    refreshToken: 'p-refresh',
  })),
  fetchUser: vi.fn(async () => ({ id: 'u9', username: 'nova-admin' })),
  fetchGuilds: vi.fn(async () => [{ id: 'g1', permissions: '32' }]),
};

test('GET /auth/authorize?app=<persona> uses that application client and records it in a cookie', async () => {
  const res = await buildWithPersonas(async () => personaClient as never).inject({
    method: 'GET',
    url: '/auth/authorize?app=app-9&guild=g1&bot=1',
  });
  expect(res.statusCode).toBe(302);
  expect(String(res.headers.location)).toContain('persona=1');
  expect(String(res.headers['set-cookie'])).toContain('dumby_oauth_app=app-9');
});

test('GET /auth/authorize?app=<unknown> refuses when no persona client resolves', async () => {
  const res = await buildWithPersonas(async () => undefined).inject({
    method: 'GET',
    url: '/auth/authorize?app=app-x&guild=g1',
  });
  expect(res.statusCode).toBe(400);
  expect(res.body).toContain('Authorization unavailable');
});

test('GET /auth/callback exchanges with the persona client and stores against its application', async () => {
  const tokens = makeTokens();
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: makeClient() as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    tokens: tokens as never,
    personaClients: (async () => personaClient) as never,
  });
  const res = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=c&state=S&guild_id=g1',
    headers: { cookie: 'dumby_oauth_state=S; dumby_oauth_guild=g1; dumby_oauth_app=app-9' },
  });
  expect(res.statusCode).toBe(200);
  expect((tokens as { connect: ReturnType<typeof vi.fn> }).connect).toHaveBeenCalledWith(
    'app-9',
    'g1',
    'u9',
    expect.any(Object),
  );
});

test('UR-20261012-073 — a successful callback records the OAuth verification', async () => {
  // A completed code exchange is PROOF Discord accepted the redirect URI: the exchange cannot
  // succeed unless the authorize leg sent a registered one. Discord exposes no API to read an
  // application's registered redirect URIs, so this is the only honest signal there is.
  const markOauthVerified = vi.fn(async () => {});
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: makeClient() as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    tokens: makeTokens() as never,
    markOauthVerified,
  });

  const res = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });

  expect(res.statusCode).toBe(200);
  expect(markOauthVerified).toHaveBeenCalledWith('app1');
});

test('UR-20261012-073 — a failing verification write does not fail the callback', async () => {
  // The authorization itself succeeded; a bookkeeping write must not turn that into an error page.
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: makeClient() as never,
    logger,
    defaultGuildId: 'g1',
    applicationId: 'app1',
    tokens: makeTokens() as never,
    markOauthVerified: async () => {
      throw new Error('database unavailable');
    },
  });

  const res = await app.inject({
    method: 'GET',
    url: '/auth/callback?code=code123&state=S',
    headers: { cookie: OK_COOKIE },
  });

  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('Connected');
});
