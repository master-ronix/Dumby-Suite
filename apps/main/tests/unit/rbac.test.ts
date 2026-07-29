import { test, expect } from 'vitest';
import {
  roleMeetsRequirement,
  resolveEffectiveGrants,
  resolveAccessDecision,
  getGrantValue,
  type RbacGrant,
} from '../../src/permissions/rbac.js';

test('role hierarchy: higher roles meet lower requirements', () => {
  expect(roleMeetsRequirement('OWNER', 'ADMIN')).toBe(true);
  expect(roleMeetsRequirement('ADMIN', 'MOD')).toBe(true);
  expect(roleMeetsRequirement('MOD', 'HELPER')).toBe(true);
  expect(roleMeetsRequirement('MEMBER', 'HELPER')).toBe(false);
});

test('RESTRICTED never satisfies any requirement, even RESTRICTED itself', () => {
  expect(roleMeetsRequirement('RESTRICTED', 'RESTRICTED')).toBe(false);
  expect(roleMeetsRequirement('RESTRICTED', 'MEMBER')).toBe(false);
});

test('exact role match satisfies its own requirement', () => {
  expect(roleMeetsRequirement('MOD', 'MOD')).toBe(true);
});

test('override hierarchy: a role-level grant hides group/set grants for the same key', () => {
  const grants: RbacGrant[] = [
    { level: 'set', type: 'permit', key: 'moderation.ban' },
    { level: 'group', type: 'permit', key: 'moderation.ban' },
    { level: 'role', type: 'blacklist', key: 'moderation.ban' },
  ];
  const effective = resolveEffectiveGrants(grants, 'moderation.ban');
  expect(effective.length).toBe(1);
  expect(effective[0]?.level).toBe('role');
  expect(resolveAccessDecision(grants, 'moderation.ban')).toBe('deny');
});

test('role-level blacklist wins even over other role-level permits', () => {
  const grants: RbacGrant[] = [
    { level: 'role', type: 'permit', key: 'moderation.ban' },
    { level: 'role', type: 'blacklist', key: 'moderation.ban' },
  ];
  expect(resolveAccessDecision(grants, 'moderation.ban')).toBe('deny');
});

test('grants union within the same level when there is no role-level grant', () => {
  const grants: RbacGrant[] = [
    { level: 'group', type: 'permit', key: 'utility.ping' },
    { level: 'group', type: 'quota', key: 'utility.ping', value: 10 },
  ];
  const effective = resolveEffectiveGrants(grants, 'utility.ping');
  expect(effective.length).toBe(2);
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('allow');
});

test('falls through role -> group -> set when higher levels have no grant for the key', () => {
  const grants: RbacGrant[] = [{ level: 'set', type: 'permit', key: 'utility.ping' }];
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('allow');
});

test('a key with no matching grant at any level resolves to no-grant', () => {
  const grants: RbacGrant[] = [{ level: 'role', type: 'permit', key: 'other.key' }];
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('no-grant');
});

test('cooldown grants take the most restrictive (longest) value within a level', () => {
  const grants: RbacGrant[] = [
    { level: 'group', type: 'cooldown', key: 'economy.daily', value: 3000 },
    { level: 'group', type: 'cooldown', key: 'economy.daily', value: 5000 },
  ];
  expect(getGrantValue(grants, 'economy.daily', 'cooldown')).toBe(5000);
});

test('quota grants take the most restrictive (smallest) value within a level', () => {
  const grants: RbacGrant[] = [
    { level: 'group', type: 'quota', key: 'economy.daily', value: 3 },
    { level: 'group', type: 'quota', key: 'economy.daily', value: 1 },
  ];
  expect(getGrantValue(grants, 'economy.daily', 'quota')).toBe(1);
});

test('getGrantValue returns undefined when no grant of that type exists for the key', () => {
  expect(getGrantValue([], 'economy.daily', 'cooldown')).toBe(undefined);
});
