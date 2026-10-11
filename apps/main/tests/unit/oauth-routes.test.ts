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
    tokens: tokens as never,
  });
  return app;
}

const OK_COOKIE = 'dumby_oauth_state=S; dumby_oauth_guild=g1';

test('GET /dashboard shows the connect state for each token status', async () => {
  const none = await build(makeClient(), undefined).inject({ method: 'GET', url: '/dashboard' });
  expect(none.statusCode).toBe(200);
  expect(none.body).toContain('Not connected');

  for (const [status, expected] of [
    ['active', 'Connected'],
    ['revoked', 'revoked'],
    ['expired', 'expired'],
  ] as const) {
    const res = await build(makeClient(), makeTokens(status)).inject({
      method: 'GET',
      url: '/dashboard',
    });
    expect(res.body).toContain(expected);
  }
});

test('GET /dashboard lists every guild with its own authorize link', async () => {
  const app = Fastify();
  registerOAuthRoutes(app, {
    client: makeClient() as never,
    logger,
    defaultGuildId: 'g1',
    tokens: makeTokens('active') as never,
    listGuilds: async () => [
      { id: 'g1', name: 'Old Server' },
      { id: 'g2', name: 'New Server' },
    ],
  });
  const res = await app.inject({ method: 'GET', url: '/dashboard' });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('Old Server');
  expect(res.body).toContain('New Server');
  expect(res.body).toContain('/auth/authorize?guild=g2');
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
    'g1',
    'u1',
    expect.objectContaining({ accessToken: 'access', refreshToken: 'refresh' }),
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
