import { describe, test, expect } from 'vitest';
import {
  validateTierRules,
  isTierValid,
  defaultEnabledForTier,
  resolveModuleEnabled,
} from '../../src/module-system/tier-rules.js';

test('a valid standard-tier module has no violations', () => {
  expect(isTierValid({ name: 'utility', tier: 'standard' })).toBe(true);
});

test('admin-tier module without devGuildOnly is a violation', () => {
  const violations = validateTierRules({ name: 'core-admin', tier: 'admin', devGuildOnly: false });
  expect(violations.some((v) => v.rule === 'admin.devGuildOnly')).toBe(true);
});

test('admin-tier module with devGuildOnly true is valid', () => {
  expect(isTierValid({ name: 'core-admin', tier: 'admin', devGuildOnly: true })).toBe(true);
});

test('marketplace-tier module without a category is a violation', () => {
  const violations = validateTierRules({ name: 'third-party-fun', tier: 'marketplace' });
  expect(violations.some((v) => v.rule === 'marketplace.category')).toBe(true);
});

test('marketplace-tier module with a category is valid', () => {
  expect(
    isTierValid({
      name: 'third-party-fun',
      tier: 'marketplace',
      hardcoded: false,
      marketplaceCategory: 'utility',
      devId: 'dev_first_party',
      buildId: 'build_test_1_0_0',
      visibility: 'public',
      releaseStatus: 'public',
    }),
  ).toBe(true);
});

test('core-tier commands may not declare an RBAC requirement', () => {
  const violations = validateTierRules({
    name: 'guild-settings',
    tier: 'core',
    hardcoded: false,
    devId: 'dev_first_party',
    buildId: 'build_test_1_0_0',
    visibility: 'public',
    releaseStatus: 'public',
    commands: [{ name: 'set-prefix', rbacRequirement: 'ADMIN' }],
  });
  expect(violations.some((v) => v.rule === 'core.noRbac')).toBe(true);
});

test('core-tier commands with no RBAC requirement are fine', () => {
  expect(
    isTierValid({
      name: 'guild-settings',
      tier: 'core',
      hardcoded: false,
      devId: 'dev_first_party',
      buildId: 'build_test_1_0_0',
      visibility: 'public',
      releaseStatus: 'public',
      commands: [{ name: 'set-prefix', rbacRequirement: null }],
    }),
  ).toBe(true);
});

test('only admin-tier modules may set devGuildOnly', () => {
  const violations = validateTierRules({ name: 'sneaky', tier: 'standard', devGuildOnly: true });
  expect(violations.some((v) => v.rule === 'devGuildOnly.adminOnly')).toBe(true);
});

test('a manifest can accumulate multiple simultaneous violations', () => {
  const violations = validateTierRules({ name: 'broken', tier: 'admin', devGuildOnly: false });
  expect(violations.length).toBeGreaterThanOrEqual(1);
});

test('defaultEnabledForTier enables everything except Marketplace', () => {
  expect(defaultEnabledForTier('admin')).toBe(true);
  expect(defaultEnabledForTier('core')).toBe(true);
  expect(defaultEnabledForTier('standard')).toBe(true);
  expect(defaultEnabledForTier('marketplace')).toBe(false);
});

describe('resolveModuleEnabled (UR-20261012-046)', () => {
  const disabled = { enabled: false, state: 'disabled' };
  const enabled = { enabled: true, state: 'active' };

  test('a CORE module is ALWAYS enabled — a stale disabled row cannot deny it', () => {
    // The reported defect: /dashboard returned "not available in guild 1062427177326497863" because
    // the dispatch path read the row alone, while the page-data filter special-cased core. §13.2: a
    // core module is never uninstallable, so it can never be disabled.
    expect(resolveModuleEnabled('core', disabled)).toBe(true);
    expect(resolveModuleEnabled('core', undefined)).toBe(true);
    expect(resolveModuleEnabled('core', enabled)).toBe(true);
  });

  test('a standard module follows its row, and defaults to enabled when there is none', () => {
    expect(resolveModuleEnabled('standard', enabled)).toBe(true);
    expect(resolveModuleEnabled('standard', disabled)).toBe(false);
    expect(resolveModuleEnabled('standard', undefined)).toBe(true);
  });

  test('a marketplace module is off until installed', () => {
    expect(resolveModuleEnabled('marketplace', undefined)).toBe(false);
    expect(resolveModuleEnabled('marketplace', enabled)).toBe(true);
  });

  test('a row that is enabled but not active still counts as disabled', () => {
    expect(resolveModuleEnabled('standard', { enabled: true, state: 'suspended' })).toBe(false);
  });

  test('an admin-tier module follows the tier default, and a row still overrides it', () => {
    // NOT a "never enabled" tier: defaultEnabledForTier is `tier !== 'marketplace'`, so admin modules
    // are enabled by default. What hides them from a member is the LISTING (page-data excludes admin
    // from the installed list) and the admin-tier gate, not the enablement rule. Recorded so the two
    // are not conflated.
    expect(resolveModuleEnabled('admin', undefined)).toBe(true);
    expect(resolveModuleEnabled('admin', { enabled: false, state: 'disabled' })).toBe(false);
  });
});
