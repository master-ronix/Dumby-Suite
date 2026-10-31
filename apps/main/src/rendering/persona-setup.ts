/**
 * UR-20261012-029 — the persona authorization setup card.
 *
 * Shown privately to a guild admin who asks for it from /persona. It states the ONE fact an admin
 * cannot discover from the bot — the OAuth callback URL their persona's Discord application must
 * register — with the short guide that surrounds it, and NOTHING ELSE (UR-20261012-054).
 */
import {
  buildComponentsV2,
  container,
  separator,
  textDisplay,
  type ComponentsV2Message,
} from '@workspace/swastik';

export interface PersonaSetupCardDeps {
  /** The URL the persona application must list under OAuth2 → Redirects. */
  callbackUrl: string;
  /** The persona's display name, when one is known. */
  personaName?: string | undefined;
}

/**
 * UR-20261012-054 — the Info card, and it carries the OAuth redirect callback guide and NOTHING else.
 *
 * The operator rejected the install guide and the invite button, and the reason is sound: whether a
 * persona's redirect URL is actually registered cannot be READ from Discord — there is no API for an
 * application's redirect list — so an invite link offered here would be a guess. A link that works only
 * if the operator already did the thing this card is asking them to do is worse than no link. So the
 * card states the requirement and stops.
 */
export function personaSetupCard(deps: PersonaSetupCardDeps): ComponentsV2Message {
  const subject =
    deps.personaName === undefined || deps.personaName === ''
      ? 'this guild\u2019s persona'
      : `**${deps.personaName}**`;

  const body = [
    '### Persona OAuth redirect',
    `Register this callback URL on ${subject}\u2019s own Discord application, so it can authorize the same way the main bot does.`,
    separator(true, 'small'),
    '**1 \u2014 Register the redirect URL**',
    'Open the persona\u2019s application in the Discord Developer Portal, go to **OAuth2 \u2192 Redirects**, and add exactly:',
    `\`${deps.callbackUrl}\``,
    '**2 \u2014 Confirm the scope**',
    'Under **OAuth2 \u2192 Scopes** the authorization requests `applications.commands.permissions.update`. It is granted during the install, not stored in the portal.',
  ].join('\n');

  return buildComponentsV2([container([textDisplay(body), separator(false, 'small')])]);
}
