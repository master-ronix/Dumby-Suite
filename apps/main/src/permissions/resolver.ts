/**
 * Seven-layer permission resolver (Cluster: Mash).
 *
 * Layer 1  Process owner check       -> full bypass, always allow.
 * Layer 2  User blacklist            -> global or per-guild block.
 * Layer 3  Environment and context   -> DM restriction.
 * Layer 4  Bot permission check.
 * Layer 5  Member permission check.
 * Layer 6  Dumby RBAC check          -> skipped entirely for Core tier.
 * Layer 7  Channel and category restriction (+ NSFW flag).
 *
 * Pure function of its input context — no DB/Discord calls happen here.
 * Callers (middleware) are responsible for resolving the context first.
 */
import type { RbacRole } from './rbac.js';
import { roleMeetsRequirement } from './rbac.js';

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

export interface PermissionContext {
  tier: ModuleTier;
  actorId: string;
  botOwnerIds: readonly string[];
  isDM: boolean;
  allowedInDM: boolean;
  guildId: string | null;
  blacklist: BlacklistLookup;
  botPermissions: readonly string[];
  requiredBotPermissions: readonly string[];
  memberPermissions: readonly string[];
  requiredMemberPermissions: readonly string[];
  rbac: {
    highestEffectiveRole: RbacRole | null;
    requiredRole: RbacRole | null;
  };
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
  // Layer 1: process owner check — unconditional bypass of everything else.
  if (ctx.botOwnerIds.includes(ctx.actorId)) {
    return ALLOW;
  }

  // Layer 2: user blacklist.
  if (ctx.blacklist.isGloballyBlacklisted(ctx.actorId)) {
    return deny(2, 'user is globally blacklisted');
  }
  if (ctx.guildId && ctx.blacklist.isGuildBlacklisted(ctx.actorId, ctx.guildId)) {
    return deny(2, 'user is blacklisted in this guild');
  }

  // Layer 3: environment and context.
  if (ctx.isDM && !ctx.allowedInDM) {
    return deny(3, 'this action is not permitted in DMs');
  }

  // Layer 4: bot permission check.
  const missingBotPerms = ctx.requiredBotPermissions.filter((p) => !ctx.botPermissions.includes(p));
  if (missingBotPerms.length > 0) {
    return deny(4, `bot is missing permissions: ${missingBotPerms.join(', ')}`);
  }

  // Layer 5: member permission check.
  const missingMemberPerms = ctx.requiredMemberPermissions.filter(
    (p) => !ctx.memberPermissions.includes(p),
  );
  if (missingMemberPerms.length > 0) {
    return deny(5, `member is missing permissions: ${missingMemberPerms.join(', ')}`);
  }

  // Layer 6: Dumby RBAC check — Core tier is exempt by design.
  if (ctx.tier !== 'core' && ctx.rbac.requiredRole) {
    const actualRole = ctx.rbac.highestEffectiveRole ?? 'MEMBER';
    if (!roleMeetsRequirement(actualRole, ctx.rbac.requiredRole)) {
      return deny(6, `requires RBAC role ${ctx.rbac.requiredRole}, actor has ${actualRole}`);
    }
  }

  // Layer 7: channel and category restriction.
  if (ctx.requiresNsfw && !ctx.channel.isNsfw) {
    return deny(7, 'this action requires an NSFW-flagged channel');
  }
  const locks = ctx.channelLocks;
  if (locks.blockedChannelIds?.includes(ctx.channel.id)) {
    return deny(7, 'this channel is locked out for this action');
  }
  if (ctx.channel.categoryId && locks.blockedCategoryIds?.includes(ctx.channel.categoryId)) {
    return deny(7, 'this category is locked out for this action');
  }
  if (
    locks.allowedChannelIds &&
    locks.allowedChannelIds.length > 0 &&
    !locks.allowedChannelIds.includes(ctx.channel.id)
  ) {
    return deny(7, 'this action is restricted to specific channels');
  }
  if (
    locks.allowedCategoryIds &&
    locks.allowedCategoryIds.length > 0 &&
    (!ctx.channel.categoryId || !locks.allowedCategoryIds.includes(ctx.channel.categoryId))
  ) {
    return deny(7, 'this action is restricted to specific categories');
  }

  if (ctx.hasExplicitPermissionDeclaration !== true) {
    return deny(7, 'no explicit permission declaration exists for this action');
  }

  return ALLOW;
}

/** Thin wrapper class so this can be registered in the DI container as CORE_TOKENS.PermissionResolver. */
export class PermissionResolver {
  resolve(ctx: PermissionContext): PermissionResult {
    return resolvePermission(ctx);
  }
}
