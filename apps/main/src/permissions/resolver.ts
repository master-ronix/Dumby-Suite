import { evaluateRank, rankMeetsRequirement, type Rank } from './rank.js';
import {
  decideApplicableGrants,
  hasGrantTypeForKey,
  resolveApplicableGrants,
  type RbacGrant,
  type RbacScopeMembership,
} from './rbac.js';

export type ModuleTier = 'admin' | 'core' | 'standard' | 'marketplace';

export interface BlacklistLookup {
  isGloballyBlacklisted(userId: string): boolean;
  isGuildBlacklisted(userId: string, guildId: string): boolean;
}

export interface ChannelLocks {
  allowedChannelIds?: readonly string[];
  blockedChannelIds?: readonly string[];
  allowedCategoryIds?: readonly string[];
  blockedCategoryIds?: readonly string[];
}

export interface AvailabilityState {
  guildKnown: boolean;
  moduleActive: boolean;
}

export interface GrantContext {
  commandKey: string;
  membership: RbacScopeMembership;
  guildGrants: readonly RbacGrant[];
}

export interface PermissionContext {
  tier: ModuleTier;
  actorId: string;
  botOwnerIds: readonly string[];
  isDM: boolean;
  allowedInDM: boolean;
  guildId: string | null;
  blacklistAvailable?: boolean;
  blacklist: BlacklistLookup;
  availability: AvailabilityState;
  botPermissions: readonly string[];
  requiredBotPermissions: readonly string[];
  memberPermissions: readonly string[];
  requiredMemberPermissions: readonly string[];
  rankInput: {
    isGuildOwner: boolean;
    restricted: boolean;
  };
  requiredRank: Rank | null;
  grants: GrantContext;
  hasExplicitPermissionDeclaration?: boolean;
  channel: {
    id: string;
    categoryId: string | null;
    isNsfw: boolean;
  };
  requiresNsfw: boolean;
  channelLocks: ChannelLocks;
}

export interface PermissionResult {
  allowed: boolean;
  layerIndex?: number;
  reason?: string;
}

function deny(layerIndex: number, reason: string): PermissionResult {
  return { allowed: false, layerIndex, reason };
}

const ALLOW: PermissionResult = { allowed: true };

export function resolvePermission(ctx: PermissionContext): PermissionResult {
  if (ctx.botOwnerIds.includes(ctx.actorId)) {
    return ALLOW;
  }

  if (ctx.blacklistAvailable === false) {
    return deny(2, 'blacklist state is unavailable (fail closed)');
  }
  if (ctx.blacklist.isGloballyBlacklisted(ctx.actorId)) {
    return deny(2, 'user is globally blacklisted');
  }
  if (ctx.guildId && ctx.blacklist.isGuildBlacklisted(ctx.actorId, ctx.guildId)) {
    return deny(2, 'user is blacklisted in this guild');
  }

  if (ctx.isDM && !ctx.allowedInDM) {
    return deny(3, 'this action is not permitted in DMs');
  }
  if (!ctx.availability.guildKnown) {
    return deny(3, 'guild is not known (fail closed)');
  }
  if (!ctx.availability.moduleActive) {
    return deny(3, 'module is not active in this guild');
  }

  const missingBotPerms = ctx.requiredBotPermissions.filter((p) => !ctx.botPermissions.includes(p));
  if (missingBotPerms.length > 0) {
    return deny(5, `bot is missing permissions: ${missingBotPerms.join(', ')}`);
  }

  const grantVerdict = layer7Decision(ctx);
  if (grantVerdict !== null) return grantVerdict;

  if (ctx.requiresNsfw && !ctx.channel.isNsfw) {
    return deny(4, 'this action requires an NSFW-flagged channel');
  }
  const locks = ctx.channelLocks;
  if (locks.blockedChannelIds?.includes(ctx.channel.id)) {
    return deny(4, 'this channel is locked out for this action');
  }
  if (ctx.channel.categoryId && locks.blockedCategoryIds?.includes(ctx.channel.categoryId)) {
    return deny(4, 'this category is locked out for this action');
  }
  if (
    locks.allowedChannelIds &&
    locks.allowedChannelIds.length > 0 &&
    !locks.allowedChannelIds.includes(ctx.channel.id)
  ) {
    return deny(4, 'this action is restricted to specific channels');
  }
  if (
    locks.allowedCategoryIds &&
    locks.allowedCategoryIds.length > 0 &&
    (!ctx.channel.categoryId || !locks.allowedCategoryIds.includes(ctx.channel.categoryId))
  ) {
    return deny(4, 'this action is restricted to specific categories');
  }

  const missingMemberPerms = ctx.requiredMemberPermissions.filter(
    (p) => !ctx.memberPermissions.includes(p),
  );
  if (missingMemberPerms.length > 0) {
    return deny(5, `member is missing permissions: ${missingMemberPerms.join(', ')}`);
  }

  if (ctx.tier !== 'core') {
    const actual = evaluateRank({
      ...ctx.rankInput,
      permissions: ctx.memberPermissions,
    });
    const required = ctx.requiredRank ?? 'MEMBER';
    if (!rankMeetsRequirement(actual, required)) {
      return deny(6, `requires RBAC rank ${required}, actor has ${actual}`);
    }
  }

  // UR-20261012-047 — the "no explicit permission declaration" DENY that stood here is REMOVED.
  //
  // It was not a layer. DIAGRAM 21-A of `permission-authorization-engine.md` lists seven, and none of
  // them is a declaration check; §21.3 says MEMBER is "the default requirement every command carries
  // when it declares nothing"; and the diagram's own closing line is "Only if every layer passes
  // without a definitive answer does the framework fall through to the final default: allow". This
  // block inverted that documented default into a denial, and mislabelled it as Layer 7 — whose real
  // job is a GRANT override that can only ALLOW or DENY, never a blanket refusal for having no grant.
  //
  // The effect in production was total: `/dashboard`, `/modules` and `/health` declare no permissions
  // (they are host-registered core commands), so EVERY core command was denied for every member who
  // was not a bot owner. The bot owner bypasses at Layer 1, which is why it looked like a per-guild
  // problem in guild 1062427177326497863 rather than a blanket one.
  //
  // `hasExplicitPermissionDeclaration` is still carried on the context and is still meaningful to a
  // caller that wants to know whether an action declared a posture; it simply no longer denies.
  return ALLOW;
}

function layer7Decision(ctx: PermissionContext): PermissionResult | null {
  if (ctx.tier === 'core' || ctx.grants.commandKey === '') return null;

  const key = ctx.grants.commandKey;
  const applicable = resolveApplicableGrants(ctx.grants.guildGrants, ctx.grants.membership, key);

  const whitelistActive = hasGrantTypeForKey(ctx.grants.guildGrants, key, 'whitelist');
  if (whitelistActive) {
    if (applicable.some((g) => g.type === 'whitelist')) {
      return ctx.rankInput.restricted ? null : ALLOW;
    }
    return deny(7, 'this command is whitelist-only and this target is not whitelisted');
  }

  const decision = decideApplicableGrants(applicable);
  if (decision === 'deny') {
    return deny(7, 'a Layer 7 grant denies this target');
  }
  if (decision === 'allow') {
    return ctx.rankInput.restricted ? null : ALLOW;
  }
  return null;
}

export class PermissionResolver {
  resolve(ctx: PermissionContext): PermissionResult {
    return resolvePermission(ctx);
  }
}
