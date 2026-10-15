/**
 * UR-20261012-031 — a persona's invite links.
 *
 * Two shapes, one control. Without an OAuth2 client secret the persona is invited like any bot:
 * a plain Discord install URL. With one, the same click also authorizes — the link points at this
 * service's own `/auth/authorize` leg, which mints the CSRF state and redirects to Discord carrying
 * the install AND permission scopes, so the token is captured as the bot joins.
 *
 * Both pin the guild: a Twill registration is single-server-bound, so there is never a guild to
 * choose between.
 */

export interface PersonaInviteDeps {
  /** This service's public origin, e.g. `https://dumby.example`. Empty disables the OAuth link. */
  publicBaseUrl: string;
  /** The bot-install permission bitfield, so Discord shows its permissions step. */
  permissions: string;
}

export interface PersonaInviteInput {
  readonly applicationId: string;
  readonly guildId: string;
  /** True when the persona has a usable OAuth2 client secret. */
  readonly withOAuth: boolean;
}

/** The invite URL for a persona: the combined install+authorize link, or the plain bot install. */
export function personaInviteUrl(input: PersonaInviteInput, deps: PersonaInviteDeps): string {
  if (input.withOAuth && deps.publicBaseUrl !== '') {
    const url = new URL('/auth/authorize', deps.publicBaseUrl);
    url.searchParams.set('app', input.applicationId);
    url.searchParams.set('guild', input.guildId);
    url.searchParams.set('bot', '1');
    return url.toString();
  }
  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', input.applicationId);
  url.searchParams.set('scope', 'bot applications.commands');
  if (deps.permissions !== '') url.searchParams.set('permissions', deps.permissions);
  url.searchParams.set('guild_id', input.guildId);
  url.searchParams.set('disable_guild_select', 'true');
  return url.toString();
}

/** This service's public origin, derived from the registered callback URL. '' when unparseable. */
export function publicBaseFrom(callbackUrl: string): string {
  try {
    return new URL(callbackUrl).origin;
  } catch {
    return '';
  }
}
