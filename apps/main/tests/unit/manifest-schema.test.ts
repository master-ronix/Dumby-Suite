import { test, expect, describe } from 'vitest';
import { parseManifest } from '../../src/module-system/manifest.schema.js';

/**
 * The manifest contract — `docs/spec/modules/module-anatomy-manifest.md` +
 * `docs/contracts/module-manifest.schema.json`. This file used to assert the *narrowed* runtime
 * schema (releaseStatus alpha/beta/stable/deprecated, no visibility, optional devId/buildId, bare
 * string depends). Those were the gaps REC-001…REC-005 / REC-019…REC-022; it now asserts the
 * contract.
 */
const base = {
  name: 'my-module',
  version: '1.0.0',
  description: 'A test module',
  tier: 'standard',
  hardcoded: false,
  devId: 1,
  buildId: 1,
  visibility: 'public',
  releaseStatus: 'public',
};

describe('parseManifest — the contract', () => {
  test('accepts a minimal valid manifest', () => {
    const m = parseManifest({ ...base });
    expect(m.name).toBe('my-module');
    expect(m.tier).toBe('standard');
    // `required` defaults to false; the contribution arrays default to empty.
    expect(m.required).toBe(false);
    expect(m.depends).toEqual([]);
    expect(m.provides).toEqual([]);
    expect(m.services).toEqual([]);
  });

  test('accepts a core-tier manifest', () => {
    const m = parseManifest({ ...base, tier: 'core', required: true });
    expect(m.tier).toBe('core');
    expect(m.required).toBe(true);
  });

  test('accepts an admin-tier manifest with devGuildOnly', () => {
    const m = parseManifest({ ...base, tier: 'admin', devGuildOnly: true });
    expect(m.tier).toBe('admin');
    expect(m.devGuildOnly).toBe(true);
  });

  test('accepts a marketplace-tier manifest with marketplaceCategory', () => {
    const m = parseManifest({ ...base, tier: 'marketplace', marketplaceCategory: 'utility' });
    expect(m.marketplaceCategory).toBe('utility');
  });

  test('accepts a hardcoded private build pinned to a guild', () => {
    const m = parseManifest({
      ...base,
      hardcoded: true,
      hardcodeGuildId: 'guild-1',
      releaseStatus: 'private',
      visibility: 'private',
    });
    expect(m.hardcoded).toBe(true);
    expect(m.hardcodeGuildId).toBe('guild-1');
  });
});

describe('required fields (ACC-MOD-0011-3)', () => {
  for (const field of [
    'name',
    'version',
    'description',
    'tier',
    'hardcoded',
    'devId',
    'buildId',
    'visibility',
    'releaseStatus',
  ]) {
    test(`omitting ${field} fails validation`, () => {
      const without: Record<string, unknown> = { ...base };
      delete without[field];
      expect(() => parseManifest(without)).toThrow();
    });
  }
});

describe('the visibility triad (one error, naming the conflict)', () => {
  test('hardcoded: true with a public release status is refused', () => {
    expect(() =>
      parseManifest({
        ...base,
        hardcoded: true,
        hardcodeGuildId: 'g1',
        releaseStatus: 'public',
        visibility: 'private',
      }),
    ).toThrow(/hardcoded: true requires releaseStatus 'private'/);
  });

  test('hardcoded: true with non-private visibility is refused', () => {
    expect(() =>
      parseManifest({
        ...base,
        hardcoded: true,
        hardcodeGuildId: 'g1',
        releaseStatus: 'private',
        visibility: 'unlisted',
      }),
    ).toThrow(/hardcoded: true requires visibility 'private'/);
  });

  test('releaseStatus public with unlisted visibility is refused', () => {
    expect(() =>
      parseManifest({ ...base, releaseStatus: 'public', visibility: 'unlisted' }),
    ).toThrow(/releaseStatus 'public' requires visibility 'public'/);
  });

  test('hardcoded: false forbids hardcodeGuildId', () => {
    expect(() => parseManifest({ ...base, hardcodeGuildId: 'g1' })).toThrow(
      /hardcoded: false forbids hardcodeGuildId/,
    );
  });

  test('a manifest breaking several rules reports them in ONE error', () => {
    let message = '';
    try {
      parseManifest({
        ...base,
        tier: 'marketplace',
        hardcoded: true,
        hardcodeGuildId: 'g1',
        releaseStatus: 'public',
        visibility: 'public',
      });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('triad');
    expect(message).toContain('releaseStatus');
    expect(message).toContain('visibility');
  });
});

describe('tier co-constraints', () => {
  test('tier admin without devGuildOnly is refused', () => {
    expect(() => parseManifest({ ...base, tier: 'admin' })).toThrow(
      /tier 'admin' requires devGuildOnly: true/,
    );
  });

  test('a non-admin tier may not set devGuildOnly', () => {
    expect(() => parseManifest({ ...base, tier: 'core', devGuildOnly: true })).toThrow(
      /only tier 'admin' may set devGuildOnly: true/,
    );
  });

  test('tier marketplace without a category is refused', () => {
    expect(() => parseManifest({ ...base, tier: 'marketplace' })).toThrow(
      /tier 'marketplace' requires a marketplaceCategory/,
    );
  });

  test('a non-marketplace tier may not declare a category', () => {
    expect(() => parseManifest({ ...base, marketplaceCategory: 'utility' })).toThrow(
      /marketplaceCategory is forbidden for tier 'standard'/,
    );
  });

  test('an unknown marketplaceCategory is refused rather than creating a sixth group', () => {
    expect(() =>
      parseManifest({ ...base, tier: 'marketplace', marketplaceCategory: 'games' }),
    ).toThrow();
  });
});

describe('structured contribution surfaces (REC-019 / REC-020)', () => {
  test('depends entries are {token, version} pins, never bare strings', () => {
    expect(() => parseManifest({ ...base, depends: ['other-module'] })).toThrow();
    const m = parseManifest({ ...base, depends: [{ token: 'core:db', version: '^1.0.0' }] });
    expect(m.depends).toEqual([{ token: 'core:db', version: '^1.0.0' }]);
  });

  test('provides entries are {token, contract}', () => {
    expect(() => parseManifest({ ...base, provides: ['core:db'] })).toThrow();
    const m = parseManifest({ ...base, provides: [{ token: 'core:db', contract: 'DbPort' }] });
    expect(m.provides[0]?.contract).toBe('DbPort');
  });

  test('services entries are {token, class, lifetime, deps}', () => {
    expect(() => parseManifest({ ...base, services: ['MyService'] })).toThrow();
    const m = parseManifest({
      ...base,
      services: [{ token: 'core:svc', class: 'MyService', lifetime: 'singleton', deps: [] }],
    });
    expect(m.services[0]?.lifetime).toBe('singleton');
  });

  test('description is capped at 120 characters', () => {
    expect(() => parseManifest({ ...base, description: 'x'.repeat(121) })).toThrow();
    expect(parseManifest({ ...base, description: 'x'.repeat(120) }).description).toHaveLength(120);
  });
});

describe('rejected inputs', () => {
  test('an unknown key is rejected (strict)', () => {
    expect(() => parseManifest({ ...base, surprise: true })).toThrow();
  });

  test('a non-kebab-case name is rejected', () => {
    expect(() => parseManifest({ ...base, name: 'My_Module' })).toThrow();
  });

  test('a non-semver version is rejected', () => {
    expect(() => parseManifest({ ...base, version: '1.0' })).toThrow();
  });

  test('an unknown tier is rejected', () => {
    expect(() => parseManifest({ ...base, tier: 'premium' })).toThrow();
  });

  test('the retired releaseStatus values are rejected', () => {
    for (const status of ['alpha', 'beta', 'stable', 'deprecated']) {
      expect(() => parseManifest({ ...base, releaseStatus: status })).toThrow();
    }
  });
});
