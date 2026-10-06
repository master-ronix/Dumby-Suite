import { test, expect } from 'vitest';
import {
  roleMeetsRequirement,
  resolveEffectiveGrants,
  resolveAccessDecision,
  decideApplicableGrants,
  getGrantValue,
  resolveScopeMembership,
  resolveApplicableGrants,
  hasGrantTypeForKey,
  type RbacGrant,
  type RbacScopeMembership,
} from '../../src/permissions/rbac.js';

type GrantOverrides = Partial<Omit<RbacGrant, 'guildId' | 'level' | 'refId' | 'type' | 'key'>>;

function grant(
  level: RbacGrant['level'],
  type: RbacGrant['type'],
  key: string,
  overrides: GrantOverrides = {},
): RbacGrant {
  return {
    guildId: 'guild-1',
    level,
    refId: level === 'role' ? `role-${key}` : `id-${key}`,
    type,
    key,
    ...overrides,
  };
}

function membership(roleIds: readonly string[]): RbacScopeMembership {
  return { roleIds, groupIds: [], setIds: [] };
}

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
    grant('set', 'permit', 'moderation.ban'),
    grant('group', 'permit', 'moderation.ban'),
    grant('role', 'blacklist', 'moderation.ban'),
  ];
  const effective = resolveEffectiveGrants(grants, 'moderation.ban');
  expect(effective.length).toBe(1);
  expect(effective[0]?.level).toBe('role');
  expect(resolveAccessDecision(grants, 'moderation.ban')).toBe('deny');
});

test('role-level blacklist wins even over other role-level permits', () => {
  const grants: RbacGrant[] = [
    grant('role', 'permit', 'moderation.ban'),
    grant('role', 'blacklist', 'moderation.ban'),
  ];
  expect(resolveAccessDecision(grants, 'moderation.ban')).toBe('deny');
});

test('grants union within the same level when there is no role-level grant', () => {
  const grants: RbacGrant[] = [
    grant('group', 'permit', 'utility.ping'),
    grant('group', 'rate-limit', 'utility.ping', { value: 10 }),
  ];
  const effective = resolveEffectiveGrants(grants, 'utility.ping');
  expect(effective.length).toBe(2);
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('allow');
});

test('falls through role -> group -> set when higher levels have no grant for the key', () => {
  const grants: RbacGrant[] = [grant('set', 'permit', 'utility.ping')];
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('allow');
});

test('a key with no matching grant at any level resolves to no-grant', () => {
  const grants: RbacGrant[] = [grant('role', 'permit', 'other.key')];
  expect(resolveAccessDecision(grants, 'utility.ping')).toBe('no-grant');
});

test('cooldown grants take the most restrictive (longest) value within a level', () => {
  const grants: RbacGrant[] = [
    grant('group', 'cooldown', 'economy.daily', { value: 3000 }),
    grant('group', 'cooldown', 'economy.daily', { value: 5000 }),
  ];
  expect(getGrantValue(grants, 'economy.daily', 'cooldown')).toBe(5000);
});

test('rate-limit grants take the most restrictive (smallest) value within a level', () => {
  const grants: RbacGrant[] = [
    grant('group', 'rate-limit', 'economy.daily', { value: 3 }),
    grant('group', 'rate-limit', 'economy.daily', { value: 1 }),
  ];
  expect(getGrantValue(grants, 'economy.daily', 'rate-limit')).toBe(1);
});

test('getGrantValue returns undefined when no grant of that type exists for the key', () => {
  expect(getGrantValue([], 'economy.daily', 'cooldown')).toBe(undefined);
});

test('scope membership: roles resolve two-step into groups and sets', () => {
  const roleIds = ['discord-mod', 'discord-admin'];
  const groupRoleBindings = [
    { groupId: 'group-1', discordRoleId: 'discord-mod' },
    { groupId: 'group-2', discordRoleId: 'discord-admin' },
    { groupId: 'group-3', discordRoleId: 'discord-unrelated' },
  ];
  const groupSetMemberships = [
    { groupId: 'group-1', setId: 'set-1' },
    { groupId: 'group-2', setId: 'set-1' },
    { groupId: 'group-3', setId: 'set-2' },
  ];
  expect(resolveScopeMembership(roleIds, groupRoleBindings, groupSetMemberships)).toEqual({
    roleIds: ['discord-mod', 'discord-admin'],
    groupIds: ['group-1', 'group-2'],
    setIds: ['set-1'],
  });
});

test('scope membership: a role with no bindings resolves to empty groups and sets', () => {
  expect(
    resolveScopeMembership(['vanilla-role'], [{ groupId: 'g', discordRoleId: 'other' }], []),
  ).toEqual({
    roleIds: ['vanilla-role'],
    groupIds: [],
    setIds: [],
  });
});

test('applicable grants: the most-specific matching scope wins (role > group > set)', () => {
  const grants: RbacGrant[] = [
    grant('role', 'blacklist', 'moderation.ban'),
    grant('group', 'permit', 'moderation.ban'),
    grant('set', 'permit', 'moderation.ban'),
  ];
  const applicable = resolveApplicableGrants(
    grants,
    {
      roleIds: ['role-moderation.ban'],
      groupIds: ['id-moderation.ban'],
      setIds: ['id-moderation.ban'],
    },
    'moderation.ban',
  );
  expect(applicable.length).toBe(1);
  expect(applicable[0]?.level).toBe('role');
  expect(resolveAccessDecision(applicable, 'moderation.ban')).toBe('deny');
});

test('applicable grants: fall through to group when the member is not in the role scope', () => {
  const grants: RbacGrant[] = [
    grant('role', 'blacklist', 'moderation.ban'),
    grant('group', 'permit', 'moderation.ban'),
  ];
  const applicable = resolveApplicableGrants(
    grants,
    { roleIds: ['other-role'], groupIds: ['id-moderation.ban'], setIds: [] },
    'moderation.ban',
  );
  expect(applicable[0]?.level).toBe('group');
  expect(resolveAccessDecision(applicable, 'moderation.ban')).toBe('allow');
});

test('applicable grants: a set-level grant is reachable when no role/group grant matches', () => {
  const grants: RbacGrant[] = [grant('set', 'permit', 'utility.ping')];
  const applicable = resolveApplicableGrants(
    grants,
    { roleIds: ['r'], groupIds: ['g'], setIds: ['id-utility.ping'] },
    'utility.ping',
  );
  expect(applicable[0]?.level).toBe('set');
  expect(resolveAccessDecision(applicable, 'utility.ping')).toBe('allow');
});

test('applicable grants: a module-wide grant matches the module command keys', () => {
  const grants: RbacGrant[] = [grant('role', 'permit', 'moderation.*')];
  const applicable = resolveApplicableGrants(
    grants,
    membership(['role-moderation.*']),
    'moderation.ban',
  );
  expect(applicable.length).toBe(1);
  expect(applicable[0]?.key).toBe('moderation.*');
});

test('applicable grants: an unrelated grant never matches', () => {
  const grants: RbacGrant[] = [grant('role', 'permit', 'utility.ping')];
  expect(
    resolveApplicableGrants(grants, membership(['role-utility.ping']), 'moderation.ban'),
  ).toEqual([]);
});

test('whitelist detection: hasGrantTypeForKey sees any whitelist for the key family', () => {
  expect(
    hasGrantTypeForKey(
      [grant('role', 'whitelist', 'moderation.ban')],
      'moderation.ban',
      'whitelist',
    ),
  ).toBe(true);
  expect(
    hasGrantTypeForKey([grant('set', 'whitelist', 'moderation.*')], 'moderation.ban', 'whitelist'),
  ).toBe(true);
  expect(
    hasGrantTypeForKey([grant('role', 'permit', 'moderation.ban')], 'moderation.ban', 'whitelist'),
  ).toBe(false);
});

test('decideApplicableGrants decides a member-scoped grant set without a key filter', () => {
  expect(decideApplicableGrants([grant('role', 'permit', 'moderation.*')])).toBe('allow');
  expect(
    decideApplicableGrants([
      grant('role', 'permit', 'moderation.ban'),
      grant('role', 'blacklist', 'moderation.ban'),
    ]),
  ).toBe('deny');
  expect(decideApplicableGrants([grant('group', 'cooldown', 'moderation.ban')])).toBe('no-grant');
  expect(decideApplicableGrants([])).toBe('no-grant');
});
