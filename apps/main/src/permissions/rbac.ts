export const RBAC_ROLE_ORDER = ['RESTRICTED', 'MEMBER', 'HELPER', 'MOD', 'ADMIN', 'OWNER'] as const;
export type RbacRole = (typeof RBAC_ROLE_ORDER)[number];

export function roleRank(role: RbacRole): number {
  return RBAC_ROLE_ORDER.indexOf(role);
}

export function roleMeetsRequirement(actual: RbacRole, required: RbacRole): boolean {
  if (actual === 'RESTRICTED') return false;
  return roleRank(actual) >= roleRank(required);
}

export type GrantType = 'permit' | 'blacklist' | 'whitelist' | 'cooldown' | 'rate-limit';
export type GrantLevel = 'role' | 'group' | 'set';

export interface RbacGrant {
  guildId: string;
  level: GrantLevel;
  refId: string;
  type: GrantType;
  key: string;
  value?: number;
}

export const GRANT_TYPE_DB_ALIASES = Object.freeze({
  'rate-limit': 'quota',
  quota: 'rate-limit',
} as const);

export interface RbacScopeMembership {
  roleIds: readonly string[];
  groupIds: readonly string[];
  setIds: readonly string[];
}

export interface GroupRoleBinding {
  groupId: string;
  discordRoleId: string;
}

export interface GroupSetMembership {
  groupId: string;
  setId: string;
}

export function resolveScopeMembership(
  roleIds: readonly string[],
  groupRoleBindings: readonly GroupRoleBinding[],
  groupSetMemberships: readonly GroupSetMembership[],
): RbacScopeMembership {
  const groupIds = new Set<string>();
  for (const roleId of roleIds) {
    for (const binding of groupRoleBindings) {
      if (binding.discordRoleId === roleId) groupIds.add(binding.groupId);
    }
  }
  const setIds = new Set<string>();
  for (const groupId of groupIds) {
    for (const membership of groupSetMemberships) {
      if (membership.groupId === groupId) setIds.add(membership.setId);
    }
  }
  return {
    roleIds: [...new Set(roleIds)],
    groupIds: [...groupIds],
    setIds: [...setIds],
  };
}

export function resolveApplicableGrants(
  grants: readonly RbacGrant[],
  membership: RbacScopeMembership,
  key: string,
): RbacGrant[] {
  const [moduleId] = key.split('.');

  const roleMatch = grants.filter(
    (g) =>
      g.level === 'role' &&
      membership.roleIds.includes(g.refId) &&
      matchesKey(g.key, key, moduleId),
  );
  if (roleMatch.length > 0) return roleMatch;

  const groupMatch = grants.filter(
    (g) =>
      g.level === 'group' &&
      membership.groupIds.includes(g.refId) &&
      matchesKey(g.key, key, moduleId),
  );
  if (groupMatch.length > 0) return groupMatch;

  const setMatch = grants.filter(
    (g) =>
      g.level === 'set' && membership.setIds.includes(g.refId) && matchesKey(g.key, key, moduleId),
  );
  if (setMatch.length > 0) return setMatch;

  return [];
}

function matchesKey(grantKey: string, commandKey: string, moduleId: string | undefined): boolean {
  if (grantKey === commandKey) return true;
  if (grantKey === `${moduleId ?? ''}.*`) return true;
  return false;
}

export function hasGrantTypeForKey(
  grants: readonly RbacGrant[],
  key: string,
  type: GrantType,
): boolean {
  const [moduleId] = key.split('.');
  return grants.some((g) => g.type === type && matchesKey(g.key, key, moduleId));
}

const LEVEL_PRIORITY: readonly GrantLevel[] = ['role', 'group', 'set'];

export function resolveEffectiveGrants(grants: readonly RbacGrant[], key: string): RbacGrant[] {
  const relevant = grants.filter((g) => g.key === key);

  const roleBlacklist = relevant.find((g) => g.level === 'role' && g.type === 'blacklist');
  if (roleBlacklist) return [roleBlacklist];

  for (const level of LEVEL_PRIORITY) {
    const atLevel = relevant.filter((g) => g.level === level);
    if (atLevel.length > 0) return atLevel;
  }
  return [];
}

export type AccessDecision = 'allow' | 'deny' | 'no-grant';

export function resolveAccessDecision(grants: readonly RbacGrant[], key: string): AccessDecision {
  const effective = resolveEffectiveGrants(grants, key);
  if (effective.some((g) => g.type === 'blacklist')) return 'deny';
  if (effective.some((g) => g.type === 'permit' || g.type === 'whitelist')) return 'allow';
  return 'no-grant';
}

export function decideApplicableGrants(applicable: readonly RbacGrant[]): AccessDecision {
  if (applicable.some((g) => g.type === 'blacklist')) return 'deny';
  if (applicable.some((g) => g.type === 'permit' || g.type === 'whitelist')) return 'allow';
  return 'no-grant';
}

export function getGrantValue(
  grants: readonly RbacGrant[],
  key: string,
  type: Extract<GrantType, 'rate-limit' | 'cooldown'>,
): number | undefined {
  const effective = resolveEffectiveGrants(grants, key).filter((g) => g.type === type);
  if (effective.length === 0) return undefined;
  const values = effective.map((g) => g.value ?? 0);
  return type === 'cooldown' ? Math.max(...values) : Math.min(...values);
}
