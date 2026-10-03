import { describe, expect, test, vi } from 'vitest';
import {
  DiscordOAuth2Client,
  buildAuthorizeUrl,
  generateOAuthState,
  validateOAuthState,
} from '../../src/http/oauth/oauth2-client.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §19.7 — the OAuth2-to-RBAC dashboard bridge. `OAUTH_CLIENT_ID` and `OAUTH_REDIRECT_URI` were
 * declared and read by no code. The bridge's first leg is the Discord OAuth2 authorization-code
 * flow: a cryptographically random `state` (CSRF defense), the authorize URL, the code exchange,
 * and the `/users/@me` verification that yields the `userId` the RBAC resolver then authorizes.
 */
const logger = createLogger('error');
const config = { clientId: '123456', clientSecret: 'shh', redirectUri: 'https://dumby.example/auth/callback' };

describe('M9 env keys — OAuth2 flow (§19.7)', () => {
  test('the authorize URL carries client_id, redirect_uri, scope and state', () => {
    const url = new URL(buildAuthorizeUrl(config, 'state-abc', ['identify', 'guilds']));
    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('123456');
    expect(url.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('identify guilds');
    expect(url.searchParams.get('state')).toBe('state-abc');
  });

  test('a fresh state is random and non-empty', () => {
    const a = generateOAuthState();
    const b = generateOAuthState();
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });

  test('state validation rejects a missing or mismatched value', () => {
    const state = generateOAuthState();
    expect(validateOAuthState(state, state)).toBe(true);
    expect(validateOAuthState(state, generateOAuthState())).toBe(false);
    expect(validateOAuthState(state, '')).toBe(false);
    expect(validateOAuthState(state, null)).toBe(false);
    expect(validateOAuthState(state, undefined)).toBe(false);
  });

  test('isConfigured is false until both the client id and redirect uri are set', () => {
    expect(new DiscordOAuth2Client({ config, logger }).isConfigured()).toBe(true);
    expect(
      new DiscordOAuth2Client({ config: { ...config, clientId: '' }, logger }).isConfigured(),
    ).toBe(false);
    expect(
      new DiscordOAuth2Client({ config: { ...config, redirectUri: '' }, logger }).isConfigured(),
    ).toBe(false);
  });

  test('exchangeCode posts the authorization_code grant and returns the token set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token-1',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'refresh-1',
      }),
    });
    const client = new DiscordOAuth2Client({ config, logger, fetchImpl: fetchImpl as never });

    const token = await client.exchangeCode('the-code');

    expect(token).toEqual({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      expiresIn: 604800,
      refreshToken: 'refresh-1',
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://discord.com/api/oauth2/token');
    expect((init as { body: URLSearchParams }).body.get('grant_type')).toBe('authorization_code');
    expect((init as { body: URLSearchParams }).body.get('code')).toBe('the-code');
  });

  test('a failed exchange throws rather than returning an empty token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    const client = new DiscordOAuth2Client({ config, logger, fetchImpl: fetchImpl as never });
    await expect(client.exchangeCode('bad')).rejects.toThrow('400');
  });

  test('fetchUser reads /users/@me with the bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '42', username: 'rachit' }),
    });
    const client = new DiscordOAuth2Client({ config, logger, fetchImpl: fetchImpl as never });

    expect(await client.fetchUser('token-1')).toEqual({ id: '42', username: 'rachit' });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://discord.com/api/users/@me');
    expect((init as { headers: Record<string, string> }).headers.authorization).toBe('Bearer token-1');
  });
});
