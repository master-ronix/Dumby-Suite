/**
 * Layer 6 — the pure backend rank function (blueprint §21.3 / concept
 * §16.1). A member's rank is EVALUATED from live Discord state and never
 * written anywhere, so no table stores a rank and no role assignment ever
 * persists.
 *
 * The ladder is inclusive upward, exactly like Discord's own native
 * permission model. ADMINISTRATOR and MODERATOR are the canonical names;
 * ADMIN and MOD are accepted short notation. ADMIN, MODERATOR and HELPER
 * are fixed permission-bit bundles a guild cannot redefine.
 *
 * RESTRICTED is the automatic floor: no member resolves below it, it
 * satisfies no requirement (not even itself), and no grant can lift it.
 */
export type Rank = 'OWNER' | 'ADMINISTRATOR' | 'MODERATOR' | 'HELPER' | 'MEMBER' | 'RESTRICTED';

/** Strongest to weakest, per Table 21-B. */
export const RANK_ORDER = [
  'OWNER',
  'ADMINISTRATOR',
  'MODERATOR',
  'HELPER',
  'MEMBER',
  'RESTRICTED',
] as const satisfies readonly Rank[];

/** Short ladder forms -> canonical rank names. */
export const CANONICAL_RANK_NAMES = Object.freeze({
  ADMIN: 'ADMINISTRATOR',
  MOD: 'MODERATOR',
} as const);

const RANK_LEVEL: Record<Rank, number> = {
  OWNER: 6,
  ADMINISTRATOR: 5,
  MODERATOR: 4,
  HELPER: 3,
  MEMBER: 2,
  RESTRICTED: 1,
};

const RANK_ALIASES = Object.freeze<Record<string, Rank>>({
  OWNER: 'OWNER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  ADMIN: 'ADMINISTRATOR',
  MODERATOR: 'MODERATOR',
  MOD: 'MODERATOR',
  HELPER: 'HELPER',
  MEMBER: 'MEMBER',
  RESTRICTED: 'RESTRICTED',
});

/** The ADMINISTRATOR bundle — canonically Discord's ADMINISTRATOR bit. */
export const ADMINISTRATOR_BUNDLE = ['Administrator'] as const;

/** The MODERATOR bundle — a fixed bit bundle, never guild-configurable. */
export const MODERATOR_BUNDLE = [
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'ManageMessages',
] as const;

/** The HELPER bundle — a lighter, fixed support-tier bundle. */
export const HELPER_BUNDLE = ['ManageMessages'] as const;

export function rankLevel(rank: Rank): number {
  return RANK_LEVEL[rank];
}

/**
 * A rank satisfies a requirement when it is at or above it on the ladder.
 * RESTRICTED never satisfies any requirement, including itself.
 */
export function rankMeetsRequirement(actual: Rank, required: Rank): boolean {
  if (actual === 'RESTRICTED') return false;
  return rankLevel(actual) >= rankLevel(required);
}

/**
 * Accepts canonical names (MODERATOR/ADMINISTRATOR) and the short ladder
 * forms (MOD/ADMIN), case-insensitively. Returns null for anything else.
 */
export function parseRankRequirement(value: string | null | undefined): Rank | null {
  if (value === null || value === undefined) return null;
  return RANK_ALIASES[value.toUpperCase()] ?? null;
}

export interface RankEvaluationInput {
  /** The guild's ownership account — distinct from BOT_OWNER_IDS (Layer 1). */
  isGuildOwner: boolean;
  /** The invoking member's live Discord permission strings. */
  permissions: readonly string[];
  /** Flagged restricted (Layer 7 blacklist grant or a platform restriction). */
  restricted: boolean;
}

function holdsEveryBit(permissions: readonly string[], bundle: readonly string[]): boolean {
  return bundle.every((bit) => permissions.includes(bit));
}

/**
 * Evaluates (never writes) the member's rank from live state. Highest
 * bundle that fully holds wins; RESTRICTED is the automatic floor.
 */
export function evaluateRank(input: RankEvaluationInput): Rank {
  if (input.restricted) return 'RESTRICTED';
  if (input.isGuildOwner) return 'OWNER';
  if (holdsEveryBit(input.permissions, ADMINISTRATOR_BUNDLE)) return 'ADMINISTRATOR';
  if (holdsEveryBit(input.permissions, MODERATOR_BUNDLE)) return 'MODERATOR';
  if (holdsEveryBit(input.permissions, HELPER_BUNDLE)) return 'HELPER';
  return 'MEMBER';
}
