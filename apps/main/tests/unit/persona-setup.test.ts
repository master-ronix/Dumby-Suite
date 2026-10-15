import { describe, expect, test } from 'vitest';
import { personaSetupCard } from '../../src/rendering/persona-setup.js';

const flatten = (value: unknown): string => JSON.stringify(value);

describe('personaSetupCard (UR-20261012-054)', () => {
  test('states the callback URL and the OAuth2 redirect guide', () => {
    const card = personaSetupCard({ callbackUrl: 'https://dumby.example/auth/callback' });
    const text = flatten(card);
    expect(text).toContain('https://dumby.example/auth/callback');
    expect(text).toContain('OAuth2');
    expect(text).toContain('Redirects');
    expect(text).toContain('applications.commands.permissions.update');
  });

  test('carries NO link button and NO invite (UR-20261012-054)', () => {
    // The install guide and the invite button were rejected, and the reason is sound: Discord
    // publishes no API for an application's redirect list, so whether the URL this card asks for is
    // actually registered cannot be READ. A link that only works if the operator already did the
    // thing the card is asking for is worse than no link.
    const card = personaSetupCard({ callbackUrl: 'https://dumby.example/auth/callback' });
    const flat = flatten((card as { components: unknown[] }).components);
    expect(flat).not.toContain('"style":5');
    expect(flat).not.toContain('"url"');
    expect(flat).not.toContain('Invite');
    expect(flat).not.toContain('Invite and authorize together');
  });

  test('names the persona when one is given', () => {
    const card = personaSetupCard({
      callbackUrl: 'https://dumby.example/auth/callback',
      personaName: 'Aurora',
    });
    expect(flatten(card)).toContain('Aurora');
  });
});
