import { describe, expect, test } from 'vitest';
import {
  PostgresDeveloperRegistry,
  resolveDeveloperNames,
  resolveRegisteredDeveloper,
} from '../../src/module-system/developer-registry.js';

describe('developer-registry', () => {
  test('the first-party developer resolves to the framework display name, not the operator handle', () => {
    // UR-20261011-013 R11 — framework-shipped surfaces attribute to "Quixotic Mnemonics"
    // (SPEC-04-REQUEST-LAYER §1.5/§11.6). The operator handle `master_ronix` is NOT the developer
    // attribution, and the Info card (developer-identity.ts) and the identity band must agree.
    expect(resolveRegisteredDeveloper('dev_first_party')).toBe('Quixotic Mnemonics');
    expect(resolveRegisteredDeveloper('qm-dev-001')).toBe('Quixotic Mnemonics');
  });

  test('an unregistered or absent developer id resolves to undefined', () => {
    expect(resolveRegisteredDeveloper('unknown-dev')).toBeUndefined();
    expect(resolveRegisteredDeveloper(undefined)).toBeUndefined();
  });
});

describe('resolveDeveloperNames — the DB-backed registry, with the static map as fallback', () => {
  test('a registered developer resolves from the registry; the rest fall back to the static map', async () => {
    const registry = {
      resolve: async (id: string) => (id === 'dev_new' ? 'new-dev' : undefined),
    };
    const names = await resolveDeveloperNames(['dev_new', 'dev_first_party', undefined], registry);
    expect(names.get('dev_new')).toBe('new-dev');
    expect(names.get('dev_first_party')).toBe('Quixotic Mnemonics');
  });

  test('a registry read that fails falls back rather than throwing (attribution is advisory)', async () => {
    const registry = {
      resolve: async () => {
        throw new Error('registry unavailable');
      },
    };
    const names = await resolveDeveloperNames(['qm-dev-001'], registry);
    expect(names.get('qm-dev-001')).toBe('Quixotic Mnemonics');
  });

  test('with no registry the static map still resolves', async () => {
    const names = await resolveDeveloperNames(['dev_first_party'], undefined);
    expect(names.get('dev_first_party')).toBe('Quixotic Mnemonics');
  });

  test('PostgresDeveloperRegistry reads the developers table', async () => {
    const row = { username: 'db-dev' };
    const knex = (() => ({
      where: () => ({ first: async () => row }),
    })) as never;
    await expect(new PostgresDeveloperRegistry(knex).resolve('dev_x')).resolves.toBe('db-dev');
  });

  test('PostgresDeveloperRegistry returns undefined when there is no row', async () => {
    const knex = (() => ({ where: () => ({ first: async () => undefined }) })) as never;
    await expect(new PostgresDeveloperRegistry(knex).resolve('dev_x')).resolves.toBeUndefined();
  });
});
