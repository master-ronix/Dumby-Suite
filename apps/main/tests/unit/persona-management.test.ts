import { test, expect, describe, vi } from 'vitest';
import {
  toPersonaUpdateColumns,
  accentToInt,
  InvalidPersonaFieldError,
} from '../../src/personas/persona.js';
import { PersonaCommandBindingService } from '../../src/personas/persona-command-binding.service.js';
import { InMemoryPersonaStores } from '../../src/personas/persona.repository.js';

/**
 * UR-20261012-081 — the persona MANAGEMENT surface: update, revoke, rotate credentials. Registration
 * created a persona; these are the operations that make one liveable.
 */

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

function makeStores() {
  const stores = new InMemoryPersonaStores();
  return stores;
}

function seed(stores: InMemoryPersonaStores, id = 'p-1') {
  stores.identities.set(id, {
    id,
    name: 'Magma',
    discordApplicationId: 'app-1',
    boundGuildId: 'g-1',
    dmBehavior: 'prohibited',
    shardAllocation: 1,
    charter: 'free',
    grandfathered: false,
    status: 'active',
    botTokenDigest: 'digest',
    botTokenSealed: { v: 1 },
  } as never);
}

function makeService(stores: InMemoryPersonaStores) {
  return new PersonaCommandBindingService(
    stores,
    stores,
    logger() as never,
    undefined,
    undefined,
    undefined,
  );
}

describe('the update validator (UR-20261012-081)', () => {
  test('only the keys present become columns — an omitted field is left alone', () => {
    expect(toPersonaUpdateColumns({ note: 'hi' })).toEqual({ note: 'hi' });
    expect(toPersonaUpdateColumns({})).toEqual({});
  });

  test('an explicit null CLEARS a presentation field', () => {
    expect(toPersonaUpdateColumns({ note: null, accent: null })).toEqual({
      note: null,
      accent: null,
    });
  });

  test('an invalid presence status is refused BY NAME', () => {
    expect(() => toPersonaUpdateColumns({ presenceStatus: 'busy' as never })).toThrow(
      InvalidPersonaFieldError,
    );
    expect(() => toPersonaUpdateColumns({ presenceStatus: 'busy' as never })).toThrow(
      /Invalid presenceStatus/,
    );
  });

  test('an invalid accent is refused, and both hex forms are accepted', () => {
    expect(() => toPersonaUpdateColumns({ accent: 'purple' })).toThrow(/Invalid accent/);
    expect(toPersonaUpdateColumns({ accent: '#7A5AF8' })).toEqual({ accent: '#7A5AF8' });
    expect(toPersonaUpdateColumns({ accent: '#7AF' })).toEqual({ accent: '#7AF' });
  });

  test('an over-long note is refused', () => {
    expect(() => toPersonaUpdateColumns({ note: 'x'.repeat(129) })).toThrow(/128 characters/);
  });

  test('an empty name and a non-positive shard allocation are refused', () => {
    expect(() => toPersonaUpdateColumns({ name: '   ' })).toThrow(/must not be empty/);
    expect(() => toPersonaUpdateColumns({ shardAllocation: 0 })).toThrow(/positive integer/);
  });

  test('an accent converts to the int a surface takes', () => {
    expect(accentToInt('#7A5AF8')).toBe(0x7a5af8);
    expect(accentToInt('#7AF')).toBe(0x77aaff);
  });
});

describe('updatePersona (UR-20261012-081)', () => {
  test('writes only what changed and returns the updated persona', async () => {
    const stores = makeStores();
    seed(stores);
    const service = makeService(stores);

    const updated = await service.updatePersona('p-1', { presenceStatus: 'idle', note: 'brb' });

    expect(updated.presenceStatus).toBe('idle');
    expect(updated.note).toBe('brb');
    expect(updated.name).toBe('Magma'); // untouched
  });

  test('an unknown persona is refused', async () => {
    const service = makeService(makeStores());
    await expect(service.updatePersona('nope', { note: 'x' })).rejects.toThrow(/No persona/);
  });

  test('an invalid field is refused before anything is written', async () => {
    const stores = makeStores();
    seed(stores);
    const service = makeService(stores);
    await expect(service.updatePersona('p-1', { accent: 'nope' })).rejects.toThrow(
      /Invalid accent/,
    );
    expect(stores.identities.get('p-1')?.accent).toBeUndefined();
  });
});

describe('revokePersona (UR-20261012-081)', () => {
  test('retires the persona and RELEASES its bindings', async () => {
    const stores = makeStores();
    seed(stores);
    stores.bindings.set('g-1:hello-world', {
      guildId: 'g-1',
      moduleSlug: 'hello-world',
      personaId: 'p-1',
    } as never);
    const service = makeService(stores);

    await service.revokePersona('p-1');

    expect(stores.identities.get('p-1')?.status).toBe('retired');
    // A revoked persona that still held a module would leave it occupied by a profile that no longer
    // exists — uninstallable by anyone.
    expect(await stores.listForPersona('p-1')).toEqual([]);
  });

  test('an unknown persona is refused', async () => {
    const service = makeService(makeStores());
    await expect(service.revokePersona('nope')).rejects.toThrow(/No persona/);
  });
});

describe('rotatePersonaCredentials (UR-20261012-081)', () => {
  test('a bot token rotation replaces the digest and the sealed value', async () => {
    const stores = makeStores();
    seed(stores);
    const service = makeService(stores);

    await service.rotatePersonaCredentials('p-1', {
      botTokenDigest: 'new-digest',
      botTokenSealed: { v: 2 },
    });

    expect(stores.identities.get('p-1')?.botTokenDigest).toBe('new-digest');
  });

  test('an OAuth secret can be replaced, and CLEARED with null', async () => {
    const stores = makeStores();
    seed(stores);
    const service = makeService(stores);

    await service.rotatePersonaCredentials('p-1', { oauthClientSecretSealed: { v: 9 } });
    expect(stores.identities.get('p-1')?.oauthClientSecretSealed).toEqual({ v: 9 });

    await service.rotatePersonaCredentials('p-1', { oauthClientSecretSealed: null });
    expect(stores.identities.get('p-1')?.oauthClientSecretSealed).toBeUndefined();
  });

  test('the credential value is never logged — only that a rotation happened', async () => {
    const stores = makeStores();
    seed(stores);
    const log = logger();
    const service = new PersonaCommandBindingService(
      stores,
      stores,
      log as never,
      undefined,
      undefined,
      undefined,
    );

    await service.rotatePersonaCredentials('p-1', {
      botTokenDigest: 'SECRET-DIGEST',
      botTokenSealed: { v: 3 },
    });

    const logged = JSON.stringify(log.info.mock.calls);
    expect(logged).toContain('persona-credentials-rotated');
    expect(logged).not.toContain('SECRET-DIGEST');
  });

  test('an unknown persona is refused', async () => {
    const service = makeService(makeStores());
    await expect(
      service.rotatePersonaCredentials('nope', { botTokenDigest: 'd', botTokenSealed: {} }),
    ).rejects.toThrow(/No persona/);
  });
});

describe('rebindPersona (UR-20261012-088)', () => {
  test('moves her to the new guild and RELEASES the bindings that belonged to the old one', async () => {
    const stores = makeStores();
    seed(stores);
    stores.bindings.set('g-1:hello-world', {
      guildId: 'g-1',
      moduleSlug: 'hello-world',
      personaId: 'p-1',
    } as never);
    const service = makeService(stores);

    const moved = await service.rebindPersona('p-1', 'g-2');

    expect(moved.boundGuildId).toBe('g-2');
    // Rows left behind would keep marking the module occupied in a guild she no longer serves.
    expect(await stores.listForPersona('p-1')).toEqual([]);
  });

  test('moving her to the guild she is already bound to is a no-op, not an error', async () => {
    const stores = makeStores();
    seed(stores);
    const service = makeService(stores);

    const same = await service.rebindPersona('p-1', 'g-1');

    expect(same.boundGuildId).toBe('g-1');
  });

  test('an unknown persona is refused', async () => {
    const service = makeService(makeStores());
    await expect(service.rebindPersona('nope', 'g-2')).rejects.toThrow(/No persona/);
  });
});
