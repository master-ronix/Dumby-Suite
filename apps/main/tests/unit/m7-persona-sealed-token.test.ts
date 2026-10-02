import { describe, expect, test } from 'vitest';
import { randomRootKey, type EnvelopeRootKey } from '../../src/crypto/envelope.js';
import {
  buildPersonaIdentity,
  derivePersonaBotTokenDigest,
  openPersonaBotToken,
  sealPersonaBotToken,
  type PersonaRegistrationInput,
} from '../../src/personas/persona.js';
import { InMemoryPersonaStores } from '../../src/personas/persona.repository.js';

const BOT_TOKEN = 'MTIzNDU2Nzg5.GhIJkl.aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789';

function registration(
  rootKey: EnvelopeRootKey,
  overrides: Partial<PersonaRegistrationInput> = {},
): PersonaRegistrationInput {
  return {
    name: 'Twix',
    discordApplicationId: 'app-1',
    boundGuildId: 'guild-1',
    botTokenDigest: derivePersonaBotTokenDigest(BOT_TOKEN),
    botTokenSealed: sealPersonaBotToken(BOT_TOKEN, rootKey),
    registrarAuthority: 'operator-1',
    ...overrides,
  };
}

describe('persona bot token is stored sealed (ADR-003)', () => {
  test('the sealed token reads back in process', () => {
    const key = randomRootKey('root-1');
    const persona = buildPersonaIdentity(registration(key));
    expect(openPersonaBotToken(persona, key)).toBe(BOT_TOKEN);
  });

  test('the digest is one-way and never the token', () => {
    const digest = derivePersonaBotTokenDigest(BOT_TOKEN);
    expect(digest).not.toContain(BOT_TOKEN);
    expect(digest).toHaveLength(64);
  });

  test('a registration without a sealed token is refused', () => {
    const key = randomRootKey('root-1');
    const sealed = sealPersonaBotToken(BOT_TOKEN, key);
    expect(() =>
      buildPersonaIdentity(registration(key, { botTokenSealed: { ...sealed, ciphertext: '' } })),
    ).toThrow(/botTokenSealed is required/u);
  });

  test('the sealed envelope survives a store round-trip', async () => {
    const key = randomRootKey('root-1');
    const stores = new InMemoryPersonaStores();
    const persona = buildPersonaIdentity(registration(key));
    await stores.create(persona);
    const found = await stores.findById(persona.id);
    expect(found === undefined ? undefined : openPersonaBotToken(found, key)).toBe(BOT_TOKEN);
  });

  test('a wrong root key cannot open the token', () => {
    const key = randomRootKey('root-1');
    const persona = buildPersonaIdentity(registration(key));
    expect(() => openPersonaBotToken(persona, randomRootKey('root-2'))).toThrow();
  });
});
