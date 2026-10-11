import { describe, expect, test } from 'vitest';
import { developerName, FIRST_PARTY_DEVELOPER } from '../../src/rendering/developer-identity.js';

describe('developerName', () => {
  test('resolves the first-party identities to the framework developer', () => {
    expect(developerName('dev_first_party')).toBe(FIRST_PARTY_DEVELOPER);
    expect(developerName('qm-dev-001')).toBe(FIRST_PARTY_DEVELOPER);
    expect(developerName(undefined)).toBe(FIRST_PARTY_DEVELOPER);
    expect(developerName('')).toBe(FIRST_PARTY_DEVELOPER);
  });

  test('returns an unknown (third-party) id verbatim', () => {
    expect(developerName('third-party-dev')).toBe('third-party-dev');
  });
});
