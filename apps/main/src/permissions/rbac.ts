/**
 * Dumby RBAC (Cluster: Mash). Six roles, lowest to highest:
 * RESTRICTED < MEMBER < HELPER < MOD < ADMIN < OWNER.
 *
 * Grants come from three levels — role, group, set — with an override
 * hierarchy of Role > Group > Set: if the actor has ANY role-level grant
 * for a key, group/set grants for that key are ignored entirely. Multiple
 * grants *within the same level* union (all apply). The one absolute
 * exception: an explicit role-level `blacklist` grant wins over every
 * other role-level grant for that key, even other permits.
 */

export const RBAC_ROLE_ORDER = ['RESTRICTED', 'MEMBER', 'HELPER', 'MOD', 'ADMIN', 'OWNER'] as const;
export type RbacRole = (typeof RBAC_ROLE_ORDER)[number];

export function roleRank(role: RbacRole): number {
  return RBAC_ROLE_ORDER.indexOf(role);
}

/** RESTRICTED never satisfies any requirement, including another RESTRICTED requirement. */
export function roleMeetsRequirement(actual: RbacRole, required: RbacRole): boolean {
  if (actual === 'RESTRICTED') return false;
  return roleRank(actual) >= roleRank(required);
}

export type GrantType = 'permit' | 'blacklist' | 'whitelist' | 'quota' | 'cooldown';
export type GrantLevel = 'role' | 'group' | 'set';

export interface RbacGrant {
  level: GrantLevel;
  type: GrantType;
  /** The command/permission key this grant applies to, e.g. "moderation.ban". */
  key: string;
  /** Numeric payload for quota/cooldown grants (quota = count, cooldown = ms). */
  value?: number;
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

/**
 * For quota/cooldown grants unioned at the same level, cooldowns take the
 * most restrictive (longest) value and quotas take the most restrictive
 * (smallest) value.
 */
export function getGrantValue(
  grants: readonly RbacGrant[],
  key: string,
  type: Extract<GrantType, 'quota' | 'cooldown'>,
): number | undefined {
  const effective = resolveEffectiveGrants(grants, key).filter((g) => g.type === type);
  if (effective.length === 0) return undefined;
  const values = effective.map((g) => g.value ?? 0);
  return type === 'cooldown' ? Math.max(...values) : Math.min(...values);
}
