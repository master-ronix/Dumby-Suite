import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '../../logging/logger.js';
import {
  COMMAND_PERMISSION_SCOPE,
  generateOAuthState,
  validateOAuthState,
  type DiscordOAuth2Client,
} from '../oauth/oauth2-client.js';
import type { CommandPermissionTokenService } from '../../commands/command-permission-tokens.js';

export const OAUTH_STATE_COOKIE = 'dumby_oauth_state';
export const OAUTH_GUILD_COOKIE = 'dumby_oauth_guild';

export interface OAuthGuildSummary {
  id: string;
  name: string;
}

export interface OAuthRoutesDeps {
  client: DiscordOAuth2Client;
  logger: Logger;
  /** The guild the dashboard's default button authorizes for. */
  defaultGuildId: string;
  /**
   * UR-20261012-028 — the Discord application the flow authorizes for. The command-permissions
   * endpoint is per-application, so the token is stored against it.
   */
  applicationId: string;
  /** Present when the token store is wired; absent the flow still runs but stores nothing. */
  tokens?: CommandPermissionTokenService | undefined;
  /** UR-20261011-023 — the guilds the bot is in, so the dashboard can authorize per guild. */
  listGuilds?: (() => Promise<readonly OAuthGuildSummary[]>) | undefined;
}

/** Manage Guild (0x20) or Administrator (0x8). */
const MANAGE_GUILD_BITS = 0x20n;
const ADMINISTRATOR_BITS = 0x8n;

function canManage(permissions: string): boolean {
  try {
    const bits = BigInt(permissions);
    return (bits & MANAGE_GUILD_BITS) !== 0n || (bits & ADMINISTRATOR_BITS) !== 0n;
  } catch {
    return false;
  }
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#1e1f22;color:#dbdee1;margin:0;padding:40px;line-height:1.5}
.card{max-width:560px;margin:0 auto;background:#2b2d31;border-radius:8px;padding:28px}
h1{font-size:20px;margin:0 0 4px}.sub{color:#949ba4;font-size:13px;margin:0 0 20px}
a.btn{display:inline-block;background:#5865f2;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600}
.ok{color:#57f287}.warn{color:#fee75c}.bad{color:#ed4245}.mono{font-family:ui-monospace,monospace;font-size:13px;color:#949ba4}</style>
</head><body><div class="card">${body}</div></body></html>`;
}

/**
 * §19.7 / UR-20261011-020 — the dashboard's Discord OAuth2 flow: `/dashboard` offers the button,
 * `/auth/authorize` mints the CSRF `state` and redirects, `/auth/callback` validates the state,
 * exchanges the code, verifies the user can manage the guild, and stores the token for later use.
 */
export function registerOAuthRoutes(app: FastifyInstance, deps: OAuthRoutesDeps): void {
  const { client, logger, defaultGuildId, applicationId, tokens } = deps;
  const scopes = ['identify', 'guilds', COMMAND_PERMISSION_SCOPE] as const;
  /**
   * UR-20261012-028 — the bot-INSTALL flow's scopes. Adding the install scopes to an authorize URL
   * is what makes Discord continue into the full code grant; with `Requires OAuth2 Code Grant` on,
   * the bot is added only after the code is exchanged, so the guild arrives already authorized.
   */
  const installScopes = [
    'bot',
    'applications.commands',
    COMMAND_PERMISSION_SCOPE,
    'identify',
    'guilds',
  ] as const;

  app.get('/auth/authorize', async (req, reply) => {
    const query = req.query as { guild?: string; bot?: string };
    const guildId = query.guild ?? defaultGuildId;
    const install = query.bot === '1';
    const state = generateOAuthState();
    const cookies = [
      // Path=/ so the callback leg receives them at BOTH /auth/callback and /oauth/callback; a
      // narrower path would silently drop them on the alias and fail the state check.
      `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `${OAUTH_GUILD_COOKIE}=${guildId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    ];
    reply.header('set-cookie', cookies);
    // The install flow leaves the guild to Discord's picker unless one was named explicitly.
    const extras =
      install && query.guild === undefined ? {} : { guildId, disableGuildSelect: install };
    return reply.redirect(
      client.authorizeUrl(state, install ? installScopes : scopes, install ? extras : {}),
    );
  });

  const handleCallback = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const query = req.query as { code?: string; state?: string; guild_id?: string };
    const cookies = parseCookies(req.headers.cookie);
    const expected = cookies[OAUTH_STATE_COOKIE];
    // UR-20261012-028 — the bot-install flow returns the guild the bot was actually added to; it
    // wins over the cookie, which for an install holds only the default.
    const guildId =
      typeof query.guild_id === 'string' && query.guild_id !== ''
        ? query.guild_id
        : (cookies[OAUTH_GUILD_COOKIE] ?? defaultGuildId);
    if (!validateOAuthState(expected ?? '', query.state)) {
      logger.warn('oauth2-state-mismatch', { guildId });
      return reply
        .code(400)
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            '<h1 class="bad">Authorization failed</h1><p class="sub">The security check did not match. Start again from the dashboard.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
          ),
        );
    }
    if (typeof query.code !== 'string' || query.code.length === 0) {
      return reply
        .code(400)
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            '<h1 class="bad">Authorization cancelled</h1><p class="sub">No code was returned. Start again from the dashboard.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
          ),
        );
    }
    try {
      const tokenSet = await client.exchangeCode(query.code);
      const user = await client.fetchUser(tokenSet.accessToken);
      const guilds = await client.fetchGuilds(tokenSet.accessToken);
      const guild = guilds.find((g) => g.id === guildId);
      if (guild === undefined || !canManage(guild.permissions)) {
        logger.warn('oauth2-not-permitted', { guildId, userId: user.id });
        return reply
          .code(403)
          .type('text/html')
          .send(
            page(
              'Dumby Suite',
              '<h1 class="bad">Not permitted</h1><p class="sub">That account cannot manage this server. Sign in with an account that has Manage Server, then try again.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
            ),
          );
      }
      if (tokens !== undefined) {
        await tokens.connect(applicationId, guildId, user.id, {
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          expiresIn: tokenSet.expiresIn,
          scope: COMMAND_PERMISSION_SCOPE,
        });
      }
      logger.info('oauth2-connected', { applicationId, guildId, userId: user.id });
      return reply
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            `<h1 class="ok">Connected</h1><p class="sub">Dumby is authorized for this server as <span class="mono">${user.username}</span>. Module disables will now hide their commands instantly.</p><a class="btn" href="/dashboard">Back to dashboard</a>`,
          ),
        );
    } catch (err) {
      logger.error('oauth2-callback-failed', { guildId, error: String(err) });
      return reply
        .code(502)
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            '<h1 class="bad">Authorization failed</h1><p class="sub">Discord did not accept the exchange. Try again from the dashboard.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
          ),
        );
    }
  };
  app.get('/auth/callback', handleCallback);
  // UR-20261011-020 — also accept the older `/oauth/callback` path, so a redirect URI already
  // registered under it in the Developer Portal keeps working without a change there.
  app.get('/oauth/callback', handleCallback);

  app.get('/dashboard', async (_req, reply) => {
    const statusOf = (guildId: string): Promise<string> =>
      tokens === undefined ? Promise.resolve('none') : tokens.status(applicationId, guildId);
    const line = (status: string): string =>
      status === 'active'
        ? '<span class="ok">Connected — module disables hide commands instantly.</span>'
        : status === 'revoked'
          ? '<span class="bad">Authorization revoked. Re-authorize to restore instant hiding.</span>'
          : status === 'expired'
            ? '<span class="warn">Token expired and cannot refresh. Re-authorize.</span>'
            : '<span class="warn">Not connected — commands are hidden on the next queue window, not instantly.</span>';

    // UR-20261011-023 — one row per guild, each with its own Authorize link. The token is per guild,
    // so authorizing covers only the guild named in the link.
    const guilds =
      deps.listGuilds === undefined ? [{ id: defaultGuildId, name: '' }] : await deps.listGuilds();
    const rows = await Promise.all(
      guilds.map(async (guild) => {
        const status = await statusOf(guild.id);
        const label = guild.name === '' ? guild.id : guild.name;
        return `<p><a class="btn" href="/auth/authorize?guild=${encodeURIComponent(guild.id)}">Authorize</a> <strong>${label}</strong><br><span class="mono">${guild.id} · ${line(status)}</span></p>`;
      }),
    );
    return reply.type('text/html').send(
      page(
        'Dumby Suite',
        `<h1>Dumby Suite</h1><p class="sub">Command permissions dashboard</p>
<p class="sub">Authorizing a guild lets Dumby hide a disabled module's commands there instantly. Do it once per guild.</p>
${rows.join('\n')}`,
      ),
    );
  });
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (header === undefined) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}
