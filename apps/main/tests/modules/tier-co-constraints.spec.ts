import { describe, expect, it } from 'vitest';
import { validateTierRules } from '../../src/module-system/tier-rules.js';
import { validateManifest } from '@workspace/swastik/validate';
/**
 * ACC-MOD-0011-4 — "Tier co-constraints hold: admin=>devGuildOnly true; marketplace=>
 * marketplaceCategory present; core=>no non-default rbac."
 *
 * Enforced in two places, deliberately: `tier-rules.ts` reports every violation for the loader's
 * diagnostics, and the schema's own superRefine rejects the manifest outright.
 */
const base = {
  name: 'tier-mod',
  version: '1.0.0',
  description: 'A module used to prove the tier co-constraints.',
  hardcoded: false,
  devId: 'dev_first_party',
  visibility: 'public',
  releaseStatus: 'public',
};

describe('ACC-MOD-0011-4 — tier co-constraints', () => {
  it('admin requires devGuildOnly: true', () => {
    expect(validateTierRules({ ...base, tier: 'admin' }).map((v) => v.rule)).toContain(
      'admin.devGuildOnly',
    );
    expect(validateManifest({ ...base, tier: 'admin' }).valid).toBe(false);
    expect(validateManifest({ ...base, tier: 'admin', devGuildOnly: true }).valid).toBe(true);
  });

  it('marketplace requires a marketplaceCategory', () => {
    expect(validateTierRules({ ...base, tier: 'marketplace' }).map((v) => v.rule)).toContain(
      'marketplace.category',
    );
    expect(validateManifest({ ...base, tier: 'marketplace' }).valid).toBe(false);
    expect(
      validateManifest({ ...base, tier: 'marketplace', marketplaceCategory: 'utility' }).valid,
    ).toBe(true);
  });

  it('an out-of-enum marketplaceCategory is rejected', () => {
    expect(
      validateManifest({ ...base, tier: 'marketplace', marketplaceCategory: 'entertainment' })
        .valid,
    ).toBe(false);
  });

  it('a non-marketplace tier may not declare a marketplaceCategory', () => {
    expect(
      validateTierRules({ ...base, tier: 'core', marketplaceCategory: 'utility' }).map(
        (v) => v.rule,
      ),
    ).toContain('marketplace.category.forbidden');
    expect(validateManifest({ ...base, tier: 'core', marketplaceCategory: 'utility' }).valid).toBe(
      false,
    );
  });

  it('core commands must not declare an RBAC requirement (Core is RBAC-exempt)', () => {
    const core = {
      ...base,
      tier: 'core' as const,
      commands: [{ name: 'hello', description: 'x', rbacRequirement: 'ADMIN' }],
    };
    expect(validateTierRules(core).map((v) => v.rule)).toContain('core.noRbac');
  });

  it('a non-admin tier may not set devGuildOnly', () => {
    expect(
      validateTierRules({ ...base, tier: 'standard', devGuildOnly: true }).map((v) => v.rule),
    ).toContain('devGuildOnly.adminOnly');
  });
});
