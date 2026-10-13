export type Rank = 'OWNER' | 'ADMINISTRATOR' | 'MODERATOR' | 'HELPER' | 'MEMBER' | 'RESTRICTED';

export const RANK_ORDER = [
  'OWNER',
  'ADMINISTRATOR',
  'MODERATOR',
  'HELPER',
  'MEMBER',
  'RESTRICTED',
] as const satisfies readonly Rank[];

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

export const ADMINISTRATOR_BUNDLE = ['Administrator'] as const;

export const MODERATOR_BUNDLE = [
  'KickMembers',
  'BanMembers',
  'ModerateMembers',
  'ManageMessages',
] as const;

export const HELPER_BUNDLE = ['ManageMessages'] as const;

/**
 * UR-20261012-053 — every permission NAME the framework asks a member about, derived from the
 * bundles above so it can never drift from them.
 *
 * The adapter that reads a Discord interaction has to decide WHICH permissions to collect, and it
 * collected a hand-written list that omitted `ManageMessages` — the one permission both
 * MODERATOR_BUNDLE and HELPER_BUNDLE require. So `holdsEveryBit` could never be satisfied for either,
 * and a moderator or helper evaluated as MEMBER. One fact, written twice, disagreeing.
 *
 * `ManageChannels` and `ManageGuild` are included because the dispatch path asks about them directly
 * (see `isGuildAdmin`), not because any rank bundle needs them.
 */
export const TRACKED_PERMISSION_NAMES: readonly string[] = [
  ...ADMINISTRATOR_BUNDLE,
  ...MODERATOR_BUNDLE,
  ...HELPER_BUNDLE,
  'ManageChannels',
  'ManageGuild',
];

export function rankLevel(rank: Rank): number {
  return RANK_LEVEL[rank];
}

export function rankMeetsRequirement(actual: Rank, required: Rank): boolean {
  if (actual === 'RESTRICTED') return false;
  return rankLevel(actual) >= rankLevel(required);
}

export function parseRankRequirement(value: string | null | undefined): Rank | null {
  if (value === null || value === undefined) return null;
  return RANK_ALIASES[value.toUpperCase()] ?? null;
}

export interface RankEvaluationInput {
  isGuildOwner: boolean;
  permissions: readonly string[];
  restricted: boolean;
}

function holdsEveryBit(permissions: readonly string[], bundle: readonly string[]): boolean {
  return bundle.every((bit) => permissions.includes(bit));
}

export function evaluateRank(input: RankEvaluationInput): Rank {
  if (input.restricted) return 'RESTRICTED';
  if (input.isGuildOwner) return 'OWNER';
  if (holdsEveryBit(input.permissions, ADMINISTRATOR_BUNDLE)) return 'ADMINISTRATOR';
  if (holdsEveryBit(input.permissions, MODERATOR_BUNDLE)) return 'MODERATOR';
  if (holdsEveryBit(input.permissions, HELPER_BUNDLE)) return 'HELPER';
  return 'MEMBER';
}
