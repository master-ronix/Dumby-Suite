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
