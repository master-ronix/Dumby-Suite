import { describe, expect, test } from 'vitest';
import { randomRootKey, seal } from '../../src/crypto/envelope.js';
import { openSealedText } from '../../src/personas/persona-credentials.js';

describe('openSealedText', () => {
  test('round-trips a sealed secret through the root key', () => {
    const rootKey = randomRootKey('local');
    const sealed = seal(new TextEncoder().encode('super-secret'), rootKey);
    expect(openSealedText(sealed, rootKey)).toBe('super-secret');
  });

  test('throws when the envelope cannot be unwrapped', () => {
    const sealed = seal(new TextEncoder().encode('super-secret'), randomRootKey('a'));
    expect(() => openSealedText(sealed, randomRootKey('b'))).toThrow();
  });
});
