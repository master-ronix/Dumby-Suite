import { describe, expect, test } from 'vitest';
import {
  isDiscordSnowflake,
  isBotToken,
  isClientSecret,
  applicationIdFromBotToken,
} from '../../src/personas/persona.js';
import { parsePersonaRegistration } from '../../src/personas/twill-registration.js';
import { randomRootKey } from '../../src/crypto/envelope.js';

/**
 * UR-20261012-089 — Twill accepts only well-formed Discord identifiers. Every value here is a format
 * Discord fixes, so a malformed one is refused at the boundary rather than discovered later as an
 * opaque failure.
 */

// A SYNTHETIC token: the first segment is base64 of an application id, as Discord mints it.
const APP_ID = '1387991780934553600';
const TOKEN = `${Buffer.from(APP_ID, 'utf8').toString('base64').replace(/=+$/, '')}.GpIvHE.${'a'.repeat(38)}`;
const OTHER_TOKEN = `${Buffer.from('1422973358818988155', 'utf8').toString('base64').replace(/=+$/, '')}.GpIvHE.${'b'.repeat(38)}`;

describe('Discord identifier shapes', () => {
  test('a snowflake is 17-20 digits and nothing else', () => {
    expect(isDiscordSnowflake('1062427177326497863')).toBe(true);
    expect(isDiscordSnowflake('1349762667828744233')).toBe(true);
    expect(isDiscordSnowflake('master_ronix')).toBe(false);
    expect(isDiscordSnowflake('12345')).toBe(false); // too short
    expect(isDiscordSnowflake('1'.repeat(21))).toBe(false); // too long
    expect(isDiscordSnowflake('1062427177326497863x')).toBe(false);
  });

  test('a bot token is three dot-separated segments', () => {
    expect(isBotToken(TOKEN)).toBe(true);
    expect(isBotToken('not-a-token')).toBe(false);
    expect(isBotToken('only.two')).toBe(false);
    expect(isBotToken('')).toBe(false);
  });

  test('a client secret is a single base64url run', () => {
    expect(isClientSecret('PI1-1rawNAseEKe0W5M3lI-Avg9b4QT2')).toBe(true);
    expect(isClientSecret('short')).toBe(false);
    expect(isClientSecret('has spaces in it')).toBe(false);
  });

  test('the application id is recoverable FROM the token', () => {
    // This is what makes "the token belongs to the application you named" checkable without Discord.
    expect(applicationIdFromBotToken(TOKEN)).toBe(APP_ID);
    expect(applicationIdFromBotToken('nope')).toBeUndefined();
  });
});

describe('registration refuses malformed identifiers', () => {
  const body = (over: Record<string, unknown> = {}) => ({
    name: 'Magma',
    discordApplicationId: APP_ID,
    boundGuildId: '1062427177326497863',
    botToken: TOKEN,
    // UR-20261021-095 — the client secret is required, exactly as the bot token and the app id are.
    oauthClientSecret: 'PI1-1rawNAseEKe0W5M3lI-Avg9b4QT2',
    registrarAuthority: '463269847023288331',
    ...over,
  });
  const parse = (over: Record<string, unknown> = {}) =>
    parsePersonaRegistration(body(over) as never, randomRootKey('test-key'));

  test('a valid body passes', () => {
    expect(parse().ok).toBe(true);
  });

  test('an application NAME is not an application id', () => {
    const r = parse({ discordApplicationId: 'Dumby Suite' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/must be a Discord application id/);
  });

  test('a server NAME is not a guild id', () => {
    const r = parse({ boundGuildId: 'Bangwing IN' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/must be a Discord server id/);
  });

  test('a USERNAME is not a registrar', () => {
    const r = parse({ registrarAuthority: 'master_ronix' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Discord USER id/);
  });

  test('a token minted for a DIFFERENT application is refused, naming both', () => {
    const r = parse({ botToken: OTHER_TOKEN });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/belongs to application 1422973358818988155/);
      expect(r.reason).toMatch(new RegExp(APP_ID));
    }
  });

  test('a malformed token is refused', () => {
    const r = parse({ botToken: 'obviously-not-a-token' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not a Discord bot token/);
  });
});
