import { describe, expect, test, vi } from 'vitest';
import { PersonaCommandBindingService } from '../../src/personas/persona-command-binding.service.js';
import {
  parseRegistrarSeed,
  seedRegistrars,
  seedRegistrarsSafely,
  type PersonaRegistrarStore,
} from '../../src/personas/persona-registrar.repository.js';
import {
  ApplicationAlreadyRegisteredError,
  RegistrarNotAuthorisedError,
  type PersonaRegistrationInput,
} from '../../src/personas/persona.js';

const input = (over: Partial<PersonaRegistrationInput> = {}): PersonaRegistrationInput =>
  ({
    name: 'Nova',
    discordApplicationId: 'app-9',
    boundGuildId: 'g1',
    botTokenDigest: 'd',
    botTokenSealed: { ciphertext: 'x' },
    registrarAuthority: 'master_ronix',
    ...over,
  }) as PersonaRegistrationInput;

const signals = { dedicatedInfrastructureRequired: false, perPersonaCostMeasurable: false };

function makeService(registrars: PersonaRegistrarStore | undefined) {
  const identities = {
    findByApplicationId: vi.fn(async () => undefined),
    create: vi.fn(async () => undefined),
  };
  const service = new PersonaCommandBindingService(
    identities as never,
    { findLive: vi.fn(), bind: vi.fn() } as never,
    { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
    registrars,
  );
  return { service, identities };
}

function registrarStore(authorised: boolean) {
  const isAuthorised = vi.fn(async () => authorised);
  return {
    store: {
      isAuthorised,
      grant: vi.fn(),
      revoke: vi.fn(),
      list: vi.fn(),
    } as PersonaRegistrarStore,
    isAuthorised,
  };
}

describe('the registrar registry is an OPTIONAL allowlist (UR-20261012-041)', () => {
  test('an EMPTY registry leaves registration open — bring-your-own-identity', async () => {
    // ADR-011/ADR-008: a guild administrator registers their OWN persona. An unconfigured registry
    // must not stand in the way; ownership is proven at the surface by the bot token.
    const { store, isAuthorised } = registrarStore(false, false);
    const { service, identities } = makeService(store);
    await service.registerPersona(input(), signals);
    expect(identities.create).toHaveBeenCalledTimes(1);
    expect(isAuthorised).not.toHaveBeenCalled();
  });

  test('no registry wired at all also leaves registration open', async () => {
    const { service, identities } = makeService(undefined);
    await service.registerPersona(input(), signals);
    expect(identities.create).toHaveBeenCalledTimes(1);
  });

  test('a CONFIGURED registry is enforced', async () => {
    const { store, isAuthorised } = registrarStore(true, true);
    const { service, identities } = makeService(store);
    await service.registerPersona(input(), signals);
    expect(isAuthorised).toHaveBeenCalledWith('master_ronix', 'app-9');
    expect(identities.create).toHaveBeenCalledTimes(1);
  });

  test('a configured registry refuses an authority that is not recorded', async () => {
    const { store } = registrarStore(false, true);
    const { service, identities } = makeService(store);
    await expect(service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      RegistrarNotAuthorisedError,
    );
    expect(identities.create).not.toHaveBeenCalled();
  });

  test('the allowlist is checked BEFORE the duplicate check', async () => {
    const { store } = registrarStore(false, true);
    const { service, identities } = makeService(store);
    identities.findByApplicationId.mockResolvedValueOnce({} as never);
    await expect(service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      RegistrarNotAuthorisedError,
    );
    const dup = makeService(registrarStore(true, true).store);
    dup.identities.findByApplicationId.mockResolvedValueOnce({} as never);
    await expect(dup.service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      ApplicationAlreadyRegisteredError,
    );
  });
});

describe('parseRegistrarSeed', () => {
  test('a bare authority grants any application', () => {
    expect(parseRegistrarSeed('master_ronix')).toEqual([
      { authority: 'master_ronix', discordApplicationId: '', grantedBy: 'config-seed' },
    ]);
  });

  test('authority=applicationId grants that application only', () => {
    expect(parseRegistrarSeed('a=app-1')).toEqual([
      { authority: 'a', discordApplicationId: 'app-1', grantedBy: 'config-seed' },
    ]);
  });

  test('parses a mixed list and ignores blanks', () => {
    expect(
      parseRegistrarSeed(' a , b=app-2 ,, ').map((r) => [r.authority, r.discordApplicationId]),
    ).toEqual([
      ['a', ''],
      ['b', 'app-2'],
    ]);
  });

  test('an empty value is an empty seed, not an error', () => {
    expect(parseRegistrarSeed('')).toEqual([]);
  });
});

describe('seedRegistrars', () => {
  test('grants every seed entry and reports the count', async () => {
    const grant = vi.fn(async () => undefined);
    const store = {
      isAuthorised: vi.fn(),
      grant,
      revoke: vi.fn(),
      list: vi.fn(),
    } as PersonaRegistrarStore;
    const written = await seedRegistrars(store, parseRegistrarSeed('a,b=app-2'));
    expect(written).toBe(2);
    expect(grant).toHaveBeenCalledTimes(2);
  });
});

describe('seedRegistrarsSafely (boot safety)', () => {
  test('a failing seed is warned about, returns 0, and DOES NOT THROW', async () => {
    const warn = vi.fn();
    const store = {
      isAuthorised: vi.fn(),
      hasAny: vi.fn(),
      grant: vi.fn(async () => {
        throw new Error('relation does not exist');
      }),
      revoke: vi.fn(),
      list: vi.fn(),
    } as PersonaRegistrarStore;
    await expect(seedRegistrarsSafely(store, parseRegistrarSeed('a'), warn)).resolves.toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('persona-registrar-seed-failed'));
  });

  test('a healthy seed reports its count', async () => {
    const store = {
      isAuthorised: vi.fn(),
      hasAny: vi.fn(),
      grant: vi.fn(async () => undefined),
      revoke: vi.fn(),
      list: vi.fn(),
    } as PersonaRegistrarStore;
    expect(await seedRegistrarsSafely(store, parseRegistrarSeed('a,b'), vi.fn())).toBe(2);
  });
});
