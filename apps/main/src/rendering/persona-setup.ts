/**
 * UR-20261012-029 — the persona authorization setup card.
 *
 * Shown privately to a guild admin who asks for it from /persona. It states the ONE fact an admin
 * cannot discover from the bot — the OAuth callback URL their persona's Discord application must
 * register — with the short guide that surrounds it, and a link through to the dashboard, where the
 * persona's invite link lives.
 */
import {
  actionRow,
  buildComponentsV2,
  container,
  linkButton,
  separator,
  textDisplay,
  type ComponentsV2Message,
} from '../shared/utils/components-v2.js';
import { customEmojiParts, PROFILE_FALLBACK, PROFILE_ICON_NAME } from './module-icons.js';

export interface PersonaSetupCardDeps {
  /** The URL the persona application must list under OAuth2 → Redirects. */
  callbackUrl: string;
  /** The dashboard, used only when no persona invite URL is available. */
  dashboardUrl: string;
  /**
   * UR-20261012-031 — the persona's own invite URL. Preferred over the dashboard, so the control
   * that summons the persona is the persona's invite, not a detour.
   */
  inviteUrl?: string | undefined;
  /** The persona's display name, when one is known. */
  personaName?: string | undefined;
}

/** The card: the callback URL, the portal guide, and the link to the invite flow. */
export function personaSetupCard(deps: PersonaSetupCardDeps): ComponentsV2Message {
  const subject =
    deps.personaName === undefined || deps.personaName === ''
      ? 'this guild\u2019s persona'
      : `**${deps.personaName}**`;

  const body = [
    '### Persona authorization setup',
    `Give ${subject} the same instant command-hiding the main bot has. A persona is a separate Discord application, so it needs its own authorization.`,
    separator(true, 'small'),
    '**1 — Register the redirect URL**',
    `Open the persona\u2019s application in the Discord Developer Portal, go to **OAuth2 \u2192 Redirects**, and add exactly:`,
    `\`${deps.callbackUrl}\``,
    '**2 — Confirm the scope**',
    'Under **OAuth2 \u2192 Scopes** the authorization requests `applications.commands.permissions.update`. It is granted during the install, not stored in the portal.',
    '**3 — Invite and authorize together**',
    'Use the invite link below: it adds the persona to its bound guild and captures its command-permission token in the same step.',
  ].join('\n');

  return buildComponentsV2([
    container([
      textDisplay(body),
      separator(false, 'small'),
      actionRow([
        linkButton(
          deps.inviteUrl !== undefined && deps.inviteUrl !== ''
            ? deps.inviteUrl
            : deps.dashboardUrl,
          'Invite link of persona to the guild',
          customEmojiParts(PROFILE_ICON_NAME) ?? { name: PROFILE_FALLBACK },
        ),
      ]),
    ]),
  ]);
}

/** The dashboard URL, derived from the registered callback URL's origin. '' when unparseable. */
export function dashboardUrlFrom(callbackUrl: string): string {
  try {
    return `${new URL(callbackUrl).origin}/dashboard`;
  } catch {
    return '';
  }
}
