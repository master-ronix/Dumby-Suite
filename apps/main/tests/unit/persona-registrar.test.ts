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

describe('registrar authorisation at registration', () => {
  test('registers when the authority is recorded for the application', async () => {
    const { store, isAuthorised } = registrarStore(true);
    const { service, identities } = makeService(store);
    await service.registerPersona(input(), signals);
    expect(isAuthorised).toHaveBeenCalledWith('master_ronix', 'app-9');
    expect(identities.create).toHaveBeenCalledTimes(1);
  });

  test('refuses an authority that is not recorded', async () => {
    const { store } = registrarStore(false);
    const { service, identities } = makeService(store);
    await expect(service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      RegistrarNotAuthorisedError,
    );
    expect(identities.create).not.toHaveBeenCalled();
  });

  test('refuses EVERY registration when no registry is wired, rather than waving it through', async () => {
    const { service, identities } = makeService(undefined);
    await expect(service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      RegistrarNotAuthorisedError,
    );
    expect(identities.create).not.toHaveBeenCalled();
  });

  test('authorisation is checked BEFORE the duplicate check', async () => {
    const { store } = registrarStore(false);
    const { service, identities } = makeService(store);
    identities.findByApplicationId.mockResolvedValueOnce({} as never);
    await expect(service.registerPersona(input(), signals)).rejects.toBeInstanceOf(
      RegistrarNotAuthorisedError,
    );
    await expect(
      makeService(registrarStore(true).store).service.registerPersona(input(), signals),
    ).resolves.toBeDefined();
    // the duplicate path still exists, just after authorisation
    const dup = makeService(registrarStore(true).store);
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
      grant: vi.fn(async () => undefined),
      revoke: vi.fn(),
      list: vi.fn(),
    } as PersonaRegistrarStore;
    expect(await seedRegistrarsSafely(store, parseRegistrarSeed('a,b'), vi.fn())).toBe(2);
  });
});
