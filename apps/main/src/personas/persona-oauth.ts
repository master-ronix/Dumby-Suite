/**
 * UR-20261012-030 (Route A) — per-persona OAuth2 clients.
 *
 * A persona is a SEPARATE Discord application, so a user token that can hide its commands must be
 * issued by that application: the command-permissions endpoint is
 * `/applications/{application.id}/guilds/{guild.id}/commands/...` and rejects a token minted by any
 * other application. Minting one needs the persona's own client secret, which the Twill
 * registration supplies sealed.
 *
 * This resolves the right client for an application id, or nothing at all — a persona registered
 * without a secret simply has no Route A authorization, and the caller falls back to Route B.
 */
import type { SealedEnvelope } from '@workspace/swastik';
import type { DiscordOAuth2Client, OAuth2Config } from '../http/oauth/oauth2-client.js';

/** The slice of the persona identity store this needs. */
export interface PersonaOAuthIdentityLookup {
  findByApplicationId(
    discordApplicationId: string,
  ): Promise<
    { discordApplicationId: string; oauthClientSecretSealed?: SealedEnvelope } | undefined
  >;
}

export interface PersonaOAuthDeps {
  identities: PersonaOAuthIdentityLookup;
  /** Opens a sealed envelope to its plaintext secret. */
  openSecret: (sealed: SealedEnvelope) => string;
  /** The shared callback URL — one redirect URI is registered on every persona application. */
  redirectUri: string;
  createClient: (config: OAuth2Config) => DiscordOAuth2Client;
  warn?: ((message: string, meta?: Record<string, unknown>) => void) | undefined;
}

export interface PersonaOAuthService {
  /** The client that can authorize for this application, or undefined when it cannot. */
  clientForApplication(applicationId: string): Promise<DiscordOAuth2Client | undefined>;
}

export function createPersonaOAuthService(deps: PersonaOAuthDeps): PersonaOAuthService {
  return {
    async clientForApplication(applicationId: string): Promise<DiscordOAuth2Client | undefined> {
      if (applicationId === '') return undefined;
      let persona:
        { discordApplicationId: string; oauthClientSecretSealed?: SealedEnvelope } | undefined;
      try {
        persona = await deps.identities.findByApplicationId(applicationId);
      } catch (err) {
        deps.warn?.('persona-oauth-lookup-failed', { applicationId, error: String(err) });
        return undefined;
      }
      if (persona === undefined || persona.oauthClientSecretSealed === undefined) return undefined;
      let secret: string;
      try {
        secret = deps.openSecret(persona.oauthClientSecretSealed);
      } catch (err) {
        deps.warn?.('persona-oauth-secret-unreadable', { applicationId, error: String(err) });
        return undefined;
      }
      if (secret === '') return undefined;
      return deps.createClient({
        clientId: persona.discordApplicationId,
        clientSecret: secret,
        redirectUri: deps.redirectUri,
      });
    },
  };
}
