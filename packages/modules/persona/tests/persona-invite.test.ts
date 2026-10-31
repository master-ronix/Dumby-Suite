import { describe, expect, test } from 'vitest';
import {
  personaInviteUrl,
  publicBaseFrom,
} from '../../../../apps/main/src/personas/persona-invite.js';

const deps = { publicBaseUrl: 'https://dumby.example', permissions: '84992' };

describe('personaInviteUrl', () => {
  test('without OAuth it is a plain bot install, pinned to the guild, carrying permissions', () => {
    const url = personaInviteUrl({ applicationId: 'app-9', guildId: 'g1', withOAuth: false }, deps);
    expect(url.startsWith('https://discord.com/oauth2/authorize')).toBe(true);
    expect(url).toContain('client_id=app-9');
    expect(url).toContain('scope=bot+applications.commands');
    expect(url).toContain('permissions=84992');
    expect(url).toContain('guild_id=g1');
    expect(url).toContain('disable_guild_select=true');
  });

  test('with OAuth it routes through our authorize leg so the state cookie is minted', () => {
    const url = personaInviteUrl({ applicationId: 'app-9', guildId: 'g1', withOAuth: true }, deps);
    expect(url.startsWith('https://dumby.example/auth/authorize')).toBe(true);
    expect(url).toContain('app=app-9');
    expect(url).toContain('guild=g1');
    expect(url).toContain('bot=1');
  });

  test('falls back to the plain install when the public base is unknown', () => {
    const url = personaInviteUrl(
      { applicationId: 'app-9', guildId: 'g1', withOAuth: true },
      { publicBaseUrl: '', permissions: '84992' },
    );
    expect(url.startsWith('https://discord.com/oauth2/authorize')).toBe(true);
  });

  test('omits the permission parameter when none is configured', () => {
    const url = personaInviteUrl(
      { applicationId: 'app-9', guildId: 'g1', withOAuth: false },
      { publicBaseUrl: '', permissions: '' },
    );
    expect(url).not.toContain('permissions=');
  });
});

describe('publicBaseFrom', () => {
  test('derives the origin from the callback URL', () => {
    expect(publicBaseFrom('https://dumby.example/auth/callback')).toBe('https://dumby.example');
  });

  test('returns empty for an unparseable URL', () => {
    expect(publicBaseFrom('nope')).toBe('');
  });
});
