import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Logger } from '../../logging/logger.js';
import { OAuth2RefreshError } from '../../commands/command-permission-tokens.js';

export const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
export const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
export const DISCORD_ME_URL = 'https://discord.com/api/users/@me';
export const DISCORD_USER_GUILDS_URL = 'https://discord.com/api/users/@me/guilds';

/** §19.7 / UR-20261011-020 — the scope the command-permissions endpoint requires. */
export const COMMAND_PERMISSION_SCOPE = 'applications.commands.permissions.update';

export interface DiscordOAuth2Guild {
  id: string;
  permissions: string;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface DiscordOAuth2User {
  id: string;
  username: string;
}

export interface OAuth2TokenSet {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string | undefined;
}

/**
 * §19.7 — the authorization redirect carries a cryptographically random `state`, validated on
 * callback, specifically to prevent CSRF where an attacker tricks a victim's browser into
 * completing a flow the attacker initiated.
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

/** Constant-time comparison, so a wrong state cannot be discovered byte by byte. */
export function validateOAuthState(expected: string, received: string | null | undefined): boolean {
  if (typeof received !== 'string' || received.length === 0) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * UR-20261012-028 — the bot-install flow's extra parameters. `guildId` preselects the guild on
 * Discord's picker and `disableGuildSelect` locks it; both apply only when the `bot` or
 * `applications.commands` scope is requested under a guild install.
 */
export interface AuthorizeExtras {
  readonly guildId?: string | undefined;
  readonly disableGuildSelect?: boolean | undefined;
  /**
   * UR-20261012-031 — the bot-install permission bitfield. Only meaningful alongside the `bot`
   * scope; Discord renders its permissions step from it.
   */
  readonly permissions?: string | undefined;
}

/** §19.7 — the Discord authorization URL the dashboard redirects to. */
export function buildAuthorizeUrl(
  config: OAuth2Config,
  state: string,
  scopes: readonly string[],
  extras: AuthorizeExtras = {},
): string {
  const url = new URL(DISCORD_AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  if (extras.guildId !== undefined && extras.guildId !== '') {
    url.searchParams.set('guild_id', extras.guildId);
  }
  if (extras.disableGuildSelect === true) url.searchParams.set('disable_guild_select', 'true');
  if (extras.permissions !== undefined && extras.permissions !== '') {
    url.searchParams.set('permissions', extras.permissions);
  }
  return url.toString();
}

export interface DiscordOAuth2ClientDeps {
  config: OAuth2Config;
  logger: Logger;
  fetchImpl?: typeof fetch;
}

interface RawTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

interface RawUserResponse {
  id?: string;
  username?: string;
}

/**
 * §19.7 — the Discord OAuth2 authorization-code flow: the dashboard redirects to `authorizeUrl`,
 * Discord calls back with a `code`, the code is exchanged for a token, and the token is verified
 * against `/users/@me` to extract the `userId` the RBAC bridge then resolves.
 */
export class DiscordOAuth2Client {
  private readonly config: OAuth2Config;
  private readonly logger: Logger;
  private readonly fetchImpl: typeof fetch;

  constructor(deps: DiscordOAuth2ClientDeps) {
    this.config = deps.config;
    this.logger = deps.logger;
    this.fetchImpl = deps.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return this.config.clientId !== '' && this.config.redirectUri !== '';
  }

  authorizeUrl(
    state: string,
    scopes: readonly string[] = ['identify', 'guilds'],
    extras: AuthorizeExtras = {},
  ): string {
    return buildAuthorizeUrl(this.config, state, scopes, extras);
  }

  async exchangeCode(code: string): Promise<OAuth2TokenSet> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
    });
    const response = await this.fetchImpl(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      this.logger.error('oauth2-token-exchange-failed', { status: response.status });
      throw new Error(`OAuth2 token exchange failed with status ${response.status}`);
    }
    const raw = (await response.json()) as RawTokenResponse;
    if (typeof raw.access_token !== 'string') {
      throw new Error('OAuth2 token exchange returned no access_token');
    }
    return {
      accessToken: raw.access_token,
      tokenType: raw.token_type ?? 'Bearer',
      expiresIn: raw.expires_in ?? 0,
      refreshToken: raw.refresh_token,
    };
  }

  /**
   * UR-20261011-020 — exchange a refresh token for a fresh access token. Discord returns a new
   * `refresh_token` alongside the access token; the caller must persist whatever comes back, because
   * reusing a superseded refresh token is refused. A 400/401 means the authorization is gone.
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string | undefined; expiresIn: number }> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const response = await this.fetchImpl(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      this.logger.warn('oauth2-refresh-failed', { status: response.status });
      throw new OAuth2RefreshError(
        `OAuth2 refresh failed with status ${response.status}`,
        response.status,
      );
    }
    const raw = (await response.json()) as RawTokenResponse;
    if (typeof raw.access_token !== 'string') {
      throw new Error('OAuth2 refresh returned no access_token');
    }
    return {
      accessToken: raw.access_token,
      refreshToken: raw.refresh_token,
      expiresIn: raw.expires_in ?? 0,
    };
  }

  /** §19.7 — the guilds the authorizing user is in, with their permission bitfields. */
  async fetchGuilds(accessToken: string): Promise<DiscordOAuth2Guild[]> {
    const response = await this.fetchImpl(DISCORD_USER_GUILDS_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      this.logger.error('oauth2-guilds-fetch-failed', { status: response.status });
      throw new Error(`OAuth2 guilds fetch failed with status ${response.status}`);
    }
    return (await response.json()) as DiscordOAuth2Guild[];
  }

  async fetchUser(accessToken: string): Promise<DiscordOAuth2User> {
    const response = await this.fetchImpl(DISCORD_ME_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      this.logger.error('oauth2-user-fetch-failed', { status: response.status });
      throw new Error(`OAuth2 user fetch failed with status ${response.status}`);
    }
    const raw = (await response.json()) as RawUserResponse;
    if (typeof raw.id !== 'string') {
      throw new Error('OAuth2 user fetch returned no id');
    }
    return { id: raw.id, username: raw.username ?? '' };
  }
}
