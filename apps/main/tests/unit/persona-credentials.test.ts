import { describe, expect, test } from 'vitest';
import { randomRootKey, seal } from '../../src/crypto/envelope.js';
import { openBotTokenOrEmpty, openSealedText } from '../../src/personas/persona-credentials.js';

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

describe('openBotTokenOrEmpty', () => {
  test('opens a readable token', () => {
    const rootKey = randomRootKey('local');
    expect(openBotTokenOrEmpty(seal(new TextEncoder().encode('tok'), rootKey), rootKey)).toBe(
      'tok',
    );
  });

  test('returns empty for an undefined envelope', () => {
    expect(openBotTokenOrEmpty(undefined, randomRootKey('local'))).toBe('');
  });

  test('returns empty rather than throwing when the envelope cannot be unwrapped', () => {
    // The point of the helper: an unreadable token must not take the disable flow down with it.
    const sealed = seal(new TextEncoder().encode('tok'), randomRootKey('a'));
    expect(openBotTokenOrEmpty(sealed, randomRootKey('b'))).toBe('');
  });
});
