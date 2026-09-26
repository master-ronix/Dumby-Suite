/**
 * Seven-layer permission resolver (Cluster: Mash), blueprint §21 — the
 * canonical sequence of DIAGRAM 21-A / Table 21-A:
 *
 *   Layer 1  Bot-owner override        -> full bypass, always allow.
 *   Layer 2  Blacklist                 -> fail closed on data unavailability.
 *   Layer 3  Guild & module availability -> fail closed.
 *   Layer 7  Grant override            -> consulted immediately after
 *                                         Layer 3, before Layers 4–6,
 *                                         module commands only; a grant's
 *                                         outcome is final.
 *   Layer 4  Channel restriction       -> fail open.
 *   Layer 5  Discord native bitfield   -> the bot's own capability check is
 *                                         an engine invariant (never
 *                                         overridable); the member bitfield
 *                                         is evaluated in Layer 5 order.
 *   Layer 6  RBAC rank (pure backend)  -> skipped for Core tier; conjunctive
 *                                         with Layer 5.
 *   default  deny-by-default           -> unless an explicit permission
 *                                         declaration exists.
 *
 * Pure function of its input context — no DB/Discord calls happen here.
 * Callers (the command router / middleware) are responsible for resolving
 * the context first and for resolving the invoking member's roles into
 * groups and sets (blueprint §21.4) before Layer 7 is asked to decide.
 */
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

/** Layer 3 inputs — fail closed on data unavailability. */
export interface AvailabilityState {
  guildKnown: boolean;
  moduleActive: boolean;
}

/**
 * Layer 7 inputs. Grants apply to module commands only; `commandKey` is
 * "" for framework surfaces that are not grant-manageable at all.
 */
export interface GrantContext {
  commandKey: string;
  /** Pre-resolved two-step membership (role -> group -> set) for the actor. */
  membership: RbacScopeMembership;
  /** This guild's grant rows, resolved fresh per interaction. */
  guildGrants: readonly RbacGrant[];
}

export interface PermissionContext {
  tier: ModuleTier;
  actorId: string;
  botOwnerIds: readonly string[];
  isDM: boolean;
  allowedInDM: boolean;
  guildId: string | null;
  /**
   * Layer 2 fail-closed flag: set false when the blacklist source cannot
   * be read, so an unreadable list never lets a blocked actor through.
   */
  blacklistAvailable?: boolean;
  blacklist: BlacklistLookup;
  availability: AvailabilityState;
  /** The bot's own capability — an engine invariant, never grant-overridable. */
  botPermissions: readonly string[];
  requiredBotPermissions: readonly string[];
  /** The invoking member's live Discord bitfield. */
  memberPermissions: readonly string[];
  requiredMemberPermissions: readonly string[];
  /** Layer 6 inputs — the rank is evaluated (never written) from these. */
  rankInput: {
    isGuildOwner: boolean;
    restricted: boolean;
  };
  /** Null falls back to the default requirement MEMBER (§21.3). */
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
  // Layer 1: process owner override — unconditional bypass of everything below.
  if (ctx.botOwnerIds.includes(ctx.actorId)) {
    return ALLOW;
  }

  // Layer 2: user blacklist. Fail closed on data unavailability.
  if (ctx.blacklistAvailable === false) {
    return deny(2, 'blacklist state is unavailable (fail closed)');
  }
  if (ctx.blacklist.isGloballyBlacklisted(ctx.actorId)) {
    return deny(2, 'user is globally blacklisted');
  }
  if (ctx.guildId && ctx.blacklist.isGuildBlacklisted(ctx.actorId, ctx.guildId)) {
    return deny(2, 'user is blacklisted in this guild');
  }

  // Layer 3: guild & module availability. Fail closed; a data outage never
  // grants access to a disabled module.
  if (ctx.isDM && !ctx.allowedInDM) {
    return deny(3, 'this action is not permitted in DMs');
  }
  if (!ctx.availability.guildKnown) {
    return deny(3, 'guild is not known (fail closed)');
  }
  if (!ctx.availability.moduleActive) {
    return deny(3, 'module is not active in this guild');
  }

  // Bot capability — the Layer 5 bitfield the bot's own identity must hold
  // for a command to function at all. Engine invariant: it is evaluated
  // before Layer 7 so no grant can ever override it (§21.6).
  const missingBotPerms = ctx.requiredBotPermissions.filter((p) => !ctx.botPermissions.includes(p));
  if (missingBotPerms.length > 0) {
    return deny(5, `bot is missing permissions: ${missingBotPerms.join(', ')}`);
  }

  // Layer 7: the grant override, consulted immediately after Layer 3.
  // A definitive grant outcome is final; otherwise fall through to 4–6.
  const grantVerdict = layer7Decision(ctx);
  if (grantVerdict !== null) return grantVerdict;

  // Layer 4: channel restriction. Fail open — an unreadable restriction
  // list degrades to "no restriction" rather than cutting off every channel.
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

  // Layer 5: the member's Discord native permission bitfield.
  const missingMemberPerms = ctx.requiredMemberPermissions.filter(
    (p) => !ctx.memberPermissions.includes(p),
  );
  if (missingMemberPerms.length > 0) {
    return deny(5, `member is missing permissions: ${missingMemberPerms.join(', ')}`);
  }

  // Layer 6: RBAC rank (the pure backend rank function). Skipped for Core
  // tier by design; conjunctive with Layer 5 — both must hold.
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

  // Deny-by-default: a non-owner action without a permission declaration is
  // denied, no matter what the layers above resolved.
  if (ctx.hasExplicitPermissionDeclaration !== true) {
    return deny(7, 'no explicit permission declaration exists for this action');
  }

  return ALLOW;
}

/**
 * Layer 7 evaluation — module commands only. A whitelist active for the key
 * restricts the command to ONLY explicitly whitelisted targets regardless
 * of rank. The RESTRICTED floor is below every rank and cannot be lifted by
 * a permit grant, so a permit on a restricted member falls through to the
 * layers below (which deny at Layer 6).
 */
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
    // A permit cannot lift the RESTRICTED floor below its below-MEMBER standing.
    return ctx.rankInput.restricted ? null : ALLOW;
  }
  return null;
}

/** Thin wrapper class so this can be registered in the DI container as CORE_TOKENS.PermissionResolver. */
export class PermissionResolver {
  resolve(ctx: PermissionContext): PermissionResult {
    return resolvePermission(ctx);
  }
}
