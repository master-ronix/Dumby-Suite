/**
 * Dumby RBAC (Cluster: Mash).
 *
 * Legacy rank ladder (short ladder forms, retained for the middleware
 * contract): RESTRICTED < MEMBER < HELPER < MOD < ADMIN < OWNER. The
 * Resolver's Layer 6 now uses the canonical ladder in rank.ts, but the
 * short-form helpers below are kept exported unchanged because
 * RBACMiddleware (src/middleware/built-in/rbac.ts) constructs against them.
 *
 * Layer 7 grants (§21.6): permit | blacklist | whitelist | cooldown |
 * rate-limit, scoped role > group > set — most-specific wins. The DB enum
 * stores the legacy spelling `quota` (see GRANT_TYPE_DB_ALIASES); the
 * engine vocabulary is the spec-canonical `rate-limit`.
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

/* ─── Layer 7 grant model ─────────────────────────────────────────────────── */

export type GrantType = 'permit' | 'blacklist' | 'whitelist' | 'cooldown' | 'rate-limit';
export type GrantLevel = 'role' | 'group' | 'set';

export interface RbacGrant {
  /** The guild that issued this grant. */
  guildId: string;
  level: GrantLevel;
  /** Role ID (role), rbac_groups.id (group), or rbac_sets.id (set). */
  refId: string;
  type: GrantType;
  /** Command key this grant applies to — "<module>.<command>" or "<module>.*". */
  key: string;
  /** Numeric payload for cooldown (ms) / rate-limit (usage ceiling). */
  value?: number;
}

/**
 * Blueprint §21.6 spellings vs the migration enum's legacy `quota` name.
 * The engine vocabulary is spec-canonical (`rate-limit`); the column enum
 * cannot be changed in place, so the DB boundary translates explicitly.
 */
export const GRANT_TYPE_DB_ALIASES = Object.freeze({
  'rate-limit': 'quota',
  quota: 'rate-limit',
} as const);

export interface RbacScopeMembership {
  /** Reference to the RbacRole ladder above; a set of Discord role IDs. */
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

/**
 * Two-step role resolution (§21.4): the member's live Discord roles resolve
 * into groups (role->group bindings), and groups into sets (group->set
 * membership). Resolved fresh per interaction — a role change takes effect
 * on the member's very next command.
 */
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

/**
 * Selects the grants applicable to a specific member for a key. Scope
 * hierarchy role > group > set — most-specific wins: when grants at
 * different scopes match, only the most specific scope's grants decide.
 * A module-wide grant ("<module>.*") matches its command keys.
 */
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

/**
 * True when any grant of a given type exists for the key, at any scope —
 * used to detect an active whitelist for a command.
 */
export function hasGrantTypeForKey(
  grants: readonly RbacGrant[],
  key: string,
  type: GrantType,
): boolean {
  const [moduleId] = key.split('.');
  return grants.some((g) => g.type === type && matchesKey(g.key, key, moduleId));
}

const LEVEL_PRIORITY: readonly GrantLevel[] = ['role', 'group', 'set'];

/**
 * Collapses a (member-applicable) grant set to the most specific level.
 * An explicit role-level `blacklist` grant wins over every other grant,
 * even other role-level permits.
 */
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
 * Decides over a set of grants that are already scoped to a member — the
 * output of `resolveApplicableGrants` (which may contain module-wide keys
 * like "<module>.*", so no key filter is applied here).
 */
export function decideApplicableGrants(applicable: readonly RbacGrant[]): AccessDecision {
  if (applicable.some((g) => g.type === 'blacklist')) return 'deny';
  if (applicable.some((g) => g.type === 'permit' || g.type === 'whitelist')) return 'allow';
  return 'no-grant';
}

/**
 * For rate-limit/cooldown grants unioned at the same level, cooldowns take
 * the most restrictive (longest) value and rate limits the most restrictive
 * (smallest) value.
 */
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
