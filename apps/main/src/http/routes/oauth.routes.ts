import type { FastifyInstance } from 'fastify';
import { generateOAuthState, type DiscordOAuth2Client } from '../oauth/oauth2-client.js';

export const OAUTH_STATE_COOKIE = 'dumby_oauth_state';

/**
 * §19.7 — the first leg of the dashboard's Discord OAuth2 flow: mint a cryptographically random
 * `state`, bind it to the browser in an `HttpOnly`/`Secure`/`SameSite=Strict` cookie, and redirect
 * to Discord's authorization URL. The callback leg validates that cookie before exchanging the
 * code — the CSRF defense §19.7 requires.
 */
export function registerOAuthRoutes(app: FastifyInstance, client: DiscordOAuth2Client): void {
  app.get('/auth/authorize', async (_req, reply) => {
    const state = generateOAuthState();
    reply.header(
      'set-cookie',
      `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=600`,
    );
    return reply.redirect(client.authorizeUrl(state));
  });
}
