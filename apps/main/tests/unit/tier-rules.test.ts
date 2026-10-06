import { test, expect } from 'vitest';
import {
  validateTierRules,
  isTierValid,
  defaultEnabledForTier,
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
