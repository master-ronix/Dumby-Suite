import { describe, expect, test } from 'vitest';
import {
  buildPersonaIdentity,
  type PersonaRegistrationInput,
} from '../../../../apps/main/src/personas/persona.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function input(over: Partial<PersonaRegistrationInput> = {}): PersonaRegistrationInput {
  return {
    name: 'ELSA',
    discordApplicationId: '1387991780934553600',
    boundGuildId: '1062427177326497863',
    botTokenDigest: 'd'.repeat(64),
    botTokenSealed: { ciphertext: 'x' } as never,
    registrarAuthority: 'master_ronix',
    ...over,
  };
}

describe('buildPersonaIdentity — the id must satisfy the schema (UR-20261012-048)', () => {
  test('the id is a BARE uuid, because the column is `uuid`', () => {
    // `persona_identities.id` is `table.uuid('id')` and `guild_persona_bindings.personaId` is a uuid FK
    // to it. The generator used to return `persona-<uuid>`, so Postgres rejected EVERY registration
    // with `invalid input syntax for type uuid`. This is that regression, pinned.
    expect(buildPersonaIdentity(input()).id).toMatch(UUID_RE);
  });

  test('it does NOT carry a decorative prefix', () => {
    expect(buildPersonaIdentity(input()).id.startsWith('persona-')).toBe(false);
  });

  test('two personas never share an id', () => {
    const ids = new Set(Array.from({ length: 200 }, () => buildPersonaIdentity(input()).id));
    expect(ids.size).toBe(200);
  });

  test('the other registered fields survive unchanged', () => {
    const persona = buildPersonaIdentity(input());
    expect(persona.name).toBe('ELSA');
    expect(persona.discordApplicationId).toBe('1387991780934553600');
    expect(persona.boundGuildId).toBe('1062427177326497863');
    expect(persona.charter).toBe('free');
    expect(persona.status).toBe('active');
    // `registrarAuthority` is an INPUT field, deliberately NOT stored on the identity — it is a
    // recorded attestation, written to the log (`persona-registered … authority=…`), not a column.
    expect(persona).not.toHaveProperty('registrarAuthority');
  });

  test('dmBehavior defaults to prohibited and shardAllocation to 1', () => {
    const persona = buildPersonaIdentity(input());
    expect(persona.dmBehavior).toBe('prohibited');
    expect(persona.shardAllocation).toBe(1);
  });

  test('an empty name is refused before anything is built', () => {
    expect(() => buildPersonaIdentity(input({ name: '  ' }))).toThrow(/name is required/);
  });
});

describe('buildPersonaIdentity carries the presentation (UR-20261012-086)', () => {
  const base = {
    name: 'Magma',
    discordApplicationId: 'app-1',
    boundGuildId: 'g-1',
    botTokenDigest: 'digest',
    botTokenSealed: { ciphertext: 'c', iv: 'i', tag: 't' },
    registrarAuthority: 'master_ronix',
  };

  test('presenceStatus, note and accent reach the row being built', () => {
    const persona = buildPersonaIdentity({
      ...base,
      presenceStatus: 'dnd',
      note: 'Magma',
      accent: '#E964A7',
    } as never);

    // These were parsed at the surface, declared on the input, and dropped here — so the row was
    // written with nulls and the runtime had no presence to apply.
    expect(persona.presenceStatus).toBe('dnd');
    expect(persona.note).toBe('Magma');
    expect(persona.accent).toBe('#E964A7');
  });

  test('absent presentation stays absent, not an empty string', () => {
    const persona = buildPersonaIdentity(base as never);
    expect(persona.presenceStatus).toBeUndefined();
    expect(persona.note).toBeUndefined();
    expect(persona.accent).toBeUndefined();
  });
});
