import { test, expect, describe } from 'vitest';
import {
  bccmScopeOf,
  moduleConfirmationPayload,
  moduleDisplayName,
} from '../../src/commands/module-confirmation.js';

/**
 * Lifted out of `bootstrap.ts`, which is effectively 0% covered, so that these branches count. The
 * global branch floor is what failed CI; every branch inside that boot function is an uncovered one.
 */
describe('a module change is confirmed privately', () => {
  test('an install says so, and says the commands are coming', () => {
    const payload = moduleConfirmationPayload({ name: 'Hello World', action: 'installed' });
    expect(String(payload['content'])).toContain('**Hello World** installed');
    expect(String(payload['content'])).toContain('being registered');
  });

  test('a disable says so, and says the commands are going', () => {
    const payload = moduleConfirmationPayload({ name: 'Hello World', action: 'disabled' });
    expect(String(payload['content'])).toContain('**Hello World** disabled');
    expect(String(payload['content'])).toContain('being removed');
  });

  test('it is EPHEMERAL — flags 64 — because the channel is not being told', () => {
    for (const action of ['installed', 'disabled'] as const) {
      expect(moduleConfirmationPayload({ name: 'X', action })['flags']).toBe(64);
    }
  });
});

describe('the BCCM scope of an acting identity', () => {
  test("the main bot's scope is the empty sentinel", () => {
    expect(bccmScopeOf(undefined)).toBe('');
  });

  test("a persona's scope is her own application", () => {
    expect(bccmScopeOf({ discordApplicationId: 'app-9' })).toBe('app-9');
  });
});

describe('the name a confirmation uses', () => {
  test('the manifest display name wins', () => {
    expect(
      moduleDisplayName(
        { manifest: { name: 'hello-world', ui: { displayName: 'Hello World' } } },
        'id',
      ),
    ).toBe('Hello World');
  });

  test('the manifest name is the fallback', () => {
    expect(moduleDisplayName({ manifest: { name: 'hello-world' } }, 'id')).toBe('hello-world');
  });

  test('and the id given is the last resort', () => {
    expect(moduleDisplayName(undefined, 'id-7')).toBe('id-7');
    expect(moduleDisplayName({}, 'id-7')).toBe('id-7');
  });
});
