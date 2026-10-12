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
/** UR-20261012-030 — the Discord application the authorization is for (a persona, or the main bot). */
export const OAUTH_APP_COOKIE = 'dumby_oauth_app';

export interface OAuthRoutesDeps {
  client: DiscordOAuth2Client;
  logger: Logger;
  /** The guild the dashboard's default button authorizes for. */
  defaultGuildId: string;
  /**
   * UR-20261012-031 — the bot-install permission bitfield. Supplying it is what makes Discord render
   * its standard permissions step on the install screen.
   */
  installPermissions?: string | undefined;
  /**
   * UR-20261012-028 — the Discord application the flow authorizes for. The command-permissions
   * endpoint is per-application, so the token is stored against it.
   */
  applicationId: string;
  /** Present when the token store is wired; absent the flow still runs but stores nothing. */
  tokens?: CommandPermissionTokenService | undefined;
  /**
   * UR-20261012-030 (Route A) — resolves the OAuth2 client for a PERSONA application, so a persona's
   * own authorization can be run. Undefined for an application with no usable secret, which is
   * exactly when Route B applies instead.
   */
  personaClients?:
    ((applicationId: string) => Promise<DiscordOAuth2Client | undefined>) | undefined;
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
    const query = req.query as { guild?: string; bot?: string; app?: string };
    const guildId = query.guild ?? defaultGuildId;
    const install = query.bot === '1';
    // UR-20261012-030 — `app` names the Discord application being authorized. Absent, it is the main
    // bot. A persona's application needs its own client, which carries its own credentials.
    const requestedApp = typeof query.app === 'string' ? query.app : '';
    const activeClient =
      requestedApp === '' || deps.personaClients === undefined
        ? client
        : await deps.personaClients(requestedApp);
    if (activeClient === undefined) {
      logger.warn('oauth2-app-unresolved', { applicationId: requestedApp, guildId });
      return reply
        .code(400)
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            '<h1 class="bad">Authorization unavailable</h1><p class="sub">That persona has no OAuth2 client secret registered, so it cannot be authorized. Add one at registration, or use the bot-token fallback.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
          ),
        );
    }
    const state = generateOAuthState();
    const cookies = [
      // Path=/ so the callback leg receives them at BOTH /auth/callback and /oauth/callback; a
      // narrower path would silently drop them on the alias and fail the state check.
      `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `${OAUTH_GUILD_COOKIE}=${guildId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `${OAUTH_APP_COOKIE}=${requestedApp}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    ];
    reply.header('set-cookie', cookies);
    // The install flow leaves the guild to Discord's picker unless one was named explicitly.
    const extras =
      install && query.guild === undefined ? {} : { guildId, disableGuildSelect: install };
    return reply.redirect(
      activeClient.authorizeUrl(state, install ? installScopes : scopes, install ? extras : {}),
    );
  });

  const handleCallback = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
    const query = req.query as { code?: string; state?: string; guild_id?: string };
    const cookiesForApp = parseCookies(req.headers.cookie);
    const requestedApp = cookiesForApp[OAUTH_APP_COOKIE] ?? '';
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
    // UR-20261012-030 — the code was issued by a specific application; only THAT application's
    // client may exchange it, and the token is stored against it.
    const exchangeClient =
      requestedApp === '' || deps.personaClients === undefined
        ? client
        : await deps.personaClients(requestedApp);
    if (exchangeClient === undefined) {
      logger.warn('oauth2-app-unresolved', { applicationId: requestedApp, guildId });
      return reply
        .code(400)
        .type('text/html')
        .send(
          page(
            'Dumby Suite',
            '<h1 class="bad">Authorization unavailable</h1><p class="sub">That persona has no OAuth2 client secret registered, so the code cannot be exchanged. Add one at registration.</p><a class="btn" href="/dashboard">Back to dashboard</a>',
          ),
        );
    }
    const tokenApplicationId = requestedApp === '' ? applicationId : requestedApp;
    try {
      const tokenSet = await exchangeClient.exchangeCode(query.code);
      const user = await exchangeClient.fetchUser(tokenSet.accessToken);
      const guilds = await exchangeClient.fetchGuilds(tokenSet.accessToken);
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
        await tokens.connect(tokenApplicationId, guildId, user.id, {
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          expiresIn: tokenSet.expiresIn,
          scope: COMMAND_PERMISSION_SCOPE,
        });
      }
      logger.info('oauth2-connected', {
        applicationId: tokenApplicationId,
        guildId,
        userId: user.id,
      });
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
    // UR-20261012-031 — the operator found the former page confusing: a guild list beside an install
    // button, and per-guild Authorize controls duplicating it. This is one purpose and one control.
    // Discord's own install screen picks the guild AND the bot's permissions, so nothing here needs
    // to enumerate guilds or permissions.
    return reply.type('text/html').send(
      page(
        'Dumby Suite',
        `<h1>Dumby Suite</h1>
<p class="sub">One step adds the bot and authorizes it, so a disabled module's commands hide instantly.</p>
<p><a class="btn" href="/auth/authorize?bot=1">Add Dumby to your server</a></p>
<p class="sub">Choose the server and the bot's permissions on Discord's own screen. Already added? The same link re-authorizes it.</p>`,
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
