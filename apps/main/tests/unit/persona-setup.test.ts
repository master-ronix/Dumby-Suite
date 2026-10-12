import { describe, expect, test } from 'vitest';
import { dashboardUrlFrom, personaSetupCard } from '../../src/rendering/persona-setup.js';

const flatten = (value: unknown): string => JSON.stringify(value);

describe('personaSetupCard', () => {
  test('states the callback URL, the guide, and links to the dashboard invite flow', () => {
    const card = personaSetupCard({
      callbackUrl: 'https://dumby.example/auth/callback',
      dashboardUrl: 'https://dumby.example/dashboard',
    });
    const text = flatten(card);
    expect(text).toContain('https://dumby.example/auth/callback');
    expect(text).toContain('OAuth2');
    expect(text).toContain('Redirects');
    expect(text).toContain('applications.commands.permissions.update');
    expect(text).toContain('Invite link of persona to the guild');
    expect(text).toContain('https://dumby.example/dashboard');
  });

  test('prefers the persona invite URL over the dashboard for the invite control', () => {
    const card = personaSetupCard({
      callbackUrl: 'https://dumby.example/auth/callback',
      dashboardUrl: 'https://dumby.example/dashboard',
      inviteUrl: 'https://dumby.example/auth/authorize?app=app-9&guild=g1&bot=1',
    });
    const flat = flatten(card);
    expect(flat).toContain('"url":"https://dumby.example/auth/authorize?app=app-9&guild=g1&bot=1"');
  });

  test('names the persona when one is given', () => {
    const card = personaSetupCard({
      callbackUrl: 'https://dumby.example/auth/callback',
      dashboardUrl: 'https://dumby.example/dashboard',
      personaName: 'Aurora',
    });
    expect(flatten(card)).toContain('Aurora');
  });

  test('the invite control is a LINK button (style 5) carrying a url, not a custom id', () => {
    const card = personaSetupCard({
      callbackUrl: 'https://dumby.example/auth/callback',
      dashboardUrl: 'https://dumby.example/dashboard',
    });
    const components = (card as { components: unknown[] }).components;
    const flat = flatten(components);
    expect(flat).toContain('"style":5');
    expect(flat).toContain('"url":"https://dumby.example/dashboard"');
  });
});

describe('dashboardUrlFrom', () => {
  test('derives the dashboard from the callback origin', () => {
    expect(dashboardUrlFrom('https://dumby.example/auth/callback')).toBe(
      'https://dumby.example/dashboard',
    );
  });

  test('returns empty for an unparseable url', () => {
    expect(dashboardUrlFrom('not a url')).toBe('');
  });
});
