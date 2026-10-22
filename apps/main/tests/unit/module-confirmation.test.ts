import { test, expect, describe } from 'vitest';
import { bccmScopeOf } from '../../src/commands/module-confirmation.js';

/**
 * Lifted out of `bootstrap.ts`, which is effectively 0% covered, so that these branches count. The
 * global branch floor is what failed CI; every branch inside that boot function is an uncovered one.
 */
describe('the BCCM scope of an acting identity', () => {
  test("the main bot's scope is the empty sentinel", () => {
    expect(bccmScopeOf(undefined)).toBe('');
  });

  test("a persona's scope is her own application", () => {
    expect(bccmScopeOf({ discordApplicationId: 'app-9' })).toBe('app-9');
  });
});
