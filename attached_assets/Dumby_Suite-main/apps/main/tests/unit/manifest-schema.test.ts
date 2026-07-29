import { test, expect, describe } from 'vitest';
import { parseManifest, ManifestValidationError } from '../../src/modules/manifest.schema.js';

const minValid = {
  name: 'my-module',
  version: '1.0.0',
  description: 'A test module',
  tier: 'standard',
  required: false,
  depends: [],
  provides: [],
  intents: [],
  partials: [],
  commands: [],
  events: [],
  services: [],
  repositories: [],
  jobs: [],
  tasks: [],
  routes: [],
  middleware: [],
  migrations: [],
  locales: ['en-US'],
  config: {},
  eventsCatalog: [],
  crossModuleReads: [],
  hardcoded: false,
  releaseStatus: 'stable',
};

describe('parseManifest', () => {
  test('accepts a minimal valid manifest', () => {
    const m = parseManifest(minValid);
    expect(m.name).toBe('my-module');
    expect(m.tier).toBe('standard');
  });

  test('accepts a core-tier manifest', () => {
    const m = parseManifest({ ...minValid, tier: 'core', required: true, releaseStatus: 'stable' });
    expect(m.tier).toBe('core');
  });

  test('accepts an admin-tier manifest with devGuildOnly', () => {
    const m = parseManifest({
      ...minValid,
      tier: 'admin',
      devGuildOnly: true,
      releaseStatus: undefined,
      hardcoded: true,
      hardcodeGuildId: 'guild-1',
    });
    expect(m.tier).toBe('admin');
    expect(m.devGuildOnly).toBe(true);
  });

  test('accepts a marketplace-tier manifest with marketplaceCategory', () => {
    const m = parseManifest({
      ...minValid,
      tier: 'marketplace',
      marketplaceCategory: 'entertainment',
    });
    expect(m.tier).toBe('marketplace');
    expect(m.marketplaceCategory).toBe('entertainment');
  });

  test('rejects a name that is not kebab-case', () => {
    expect(() => parseManifest({ ...minValid, name: 'My Module' })).toThrow(ManifestValidationError);
  });

  test('rejects a version that is not semver', () => {
    expect(() => parseManifest({ ...minValid, version: 'v1.0' })).toThrow(ManifestValidationError);
  });

  test('rejects an empty description', () => {
    expect(() => parseManifest({ ...minValid, description: '' })).toThrow(ManifestValidationError);
  });

  test('rejects an unknown tier', () => {
    expect(() => parseManifest({ ...minValid, tier: 'premium' })).toThrow(ManifestValidationError);
  });

  test('rejects extra fields due to .strict()', () => {
    expect(() => parseManifest({ ...minValid, unknown: 'extra' })).toThrow(ManifestValidationError);
  });

  test('ManifestValidationError.moduleName contains the module name', () => {
    try {
      parseManifest({ ...minValid, name: '' });
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
    }
  });

  test('accepts a command with an rbacRequirement', () => {
    const m = parseManifest({
      ...minValid,
      tier: 'standard',
      commands: [{ name: 'ban', description: 'Ban a user', rbacRequirement: 'MOD' }],
    });
    expect(m.commands[0]?.rbacRequirement).toBe('MOD');
  });

  test('rejects a command rbacRequirement with an invalid role', () => {
    expect(() => parseManifest({
      ...minValid,
      commands: [{ name: 'cmd', description: 'desc', rbacRequirement: 'SUPERUSER' }],
    })).toThrow(ManifestValidationError);
  });

  test('eventsCatalog entries must match domain.entity.action pattern', () => {
    expect(() => parseManifest({
      ...minValid,
      eventsCatalog: [{ name: 'bad-name', description: 'test' }],
    })).toThrow(ManifestValidationError);
  });

  test('valid eventsCatalog entry passes', () => {
    const m = parseManifest({
      ...minValid,
      eventsCatalog: [{ name: 'economy.reward.granted', description: 'A reward was granted' }],
    });
    expect(m.eventsCatalog[0]?.name).toBe('economy.reward.granted');
  });

  test('crossModuleReads accessor must end with ForCrossModuleRead', () => {
    expect(() => parseManifest({
      ...minValid,
      crossModuleReads: [{ targetModule: 'guild-settings', accessor: 'getConfig' }],
    })).toThrow(ManifestValidationError);
  });

  test('valid crossModuleReads entry passes', () => {
    const m = parseManifest({
      ...minValid,
      crossModuleReads: [{ targetModule: 'guild-settings', accessor: 'getConfigForCrossModuleRead' }],
    });
    expect(m.crossModuleReads[0]?.targetModule).toBe('guild-settings');
  });
});
