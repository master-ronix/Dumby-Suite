import { test, expect, vi } from 'vitest';
import {
  generateOAuthState,
  validateOAuthState,
  buildAuthorizeUrl,
  DiscordOAuth2Client,
  DISCORD_AUTHORIZE_URL,
} from '../../src/http/oauth/oauth2-client.js';

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as never;
const config = { clientId: 'cid', clientSecret: 'sec', redirectUri: 'https://app/cb' };

test('generateOAuthState is random and validateOAuthState is strict', () => {
  const a = generateOAuthState();
  const b = generateOAuthState();
  expect(a).not.toBe(b);
  expect(validateOAuthState(a, a)).toBe(true);
  expect(validateOAuthState(a, b)).toBe(false);
  expect(validateOAuthState(a, null)).toBe(false);
  expect(validateOAuthState(a, '')).toBe(false);
  expect(validateOAuthState(a, `${a}x`)).toBe(false);
});

test('buildAuthorizeUrl carries client, redirect, scope, state and response type', () => {
  const url = new URL(buildAuthorizeUrl(config, 'st', ['identify', 'guilds']));
  expect(`${url.origin}${url.pathname}`).toBe(DISCORD_AUTHORIZE_URL);
  expect(url.searchParams.get('client_id')).toBe('cid');
  expect(url.searchParams.get('redirect_uri')).toBe('https://app/cb');
  expect(url.searchParams.get('scope')).toBe('identify guilds');
  expect(url.searchParams.get('state')).toBe('st');
  expect(url.searchParams.get('response_type')).toBe('code');
});

test('DiscordOAuth2Client exchanges a code and fetches the user', async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'tok',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'r',
        }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'u1', username: 'bob' }), { status: 200 }),
    );

  const client = new DiscordOAuth2Client({ config, logger, fetchImpl });
  expect(client.isConfigured()).toBe(true);
  expect(client.authorizeUrl('s')).toContain('client_id=cid');

  const tokens = await client.exchangeCode('code123');
  expect(tokens).toStrictEqual({
    accessToken: 'tok',
    tokenType: 'Bearer',
    expiresIn: 3600,
    refreshToken: 'r',
  });

  const user = await client.fetchUser('tok');
  expect(user).toStrictEqual({ id: 'u1', username: 'bob' });
});

test('DiscordOAuth2Client surfaces exchange and fetch failures', async () => {
  const failing = vi.fn().mockResolvedValue(new Response('nope', { status: 400 }));
  const client = new DiscordOAuth2Client({ config, logger, fetchImpl: failing });
  await expect(client.exchangeCode('c')).rejects.toThrow(/status 400/);
  await expect(client.fetchUser('t')).rejects.toThrow(/status 400/);

  const noToken = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  await expect(
    new DiscordOAuth2Client({ config, logger, fetchImpl: noToken }).exchangeCode('c'),
  ).rejects.toThrow(/no access_token/);

  const noId = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
  await expect(
    new DiscordOAuth2Client({ config, logger, fetchImpl: noId }).fetchUser('t'),
  ).rejects.toThrow(/no id/);
});

test('DiscordOAuth2Client refreshes a token and lists the user guilds', async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: 'new', refresh_token: 'rot', expires_in: 604800 }),
        { status: 200 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: 'g1', permissions: '32' }]), { status: 200 }),
    );
  const client = new DiscordOAuth2Client({ config, logger, fetchImpl });
  expect(await client.refreshToken('old')).toStrictEqual({
    accessToken: 'new',
    refreshToken: 'rot',
    expiresIn: 604800,
  });
  expect(await client.fetchGuilds('new')).toStrictEqual([{ id: 'g1', permissions: '32' }]);
});

test('DiscordOAuth2Client surfaces a refresh refusal and a guilds failure', async () => {
  const failing = vi.fn().mockResolvedValue(new Response('no', { status: 401 }));
  const client = new DiscordOAuth2Client({ config, logger, fetchImpl: failing });
  await expect(client.refreshToken('old')).rejects.toThrow(/status 401/);
  await expect(client.fetchGuilds('t')).rejects.toThrow(/status 401/);
});

test('isConfigured is false for an empty client id', () => {
  const client = new DiscordOAuth2Client({
    config: { clientId: '', clientSecret: '', redirectUri: '' },
    logger,
  });
  expect(client.isConfigured()).toBe(false);
});
