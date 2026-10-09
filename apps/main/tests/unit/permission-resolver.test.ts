import { test, expect } from 'vitest';
import { resolvePermission, type PermissionContext } from '../../src/permissions/resolver.js';
import { checkAdminTierGate } from '../../src/permissions/admin-tier-gate.js';

const MOD_BITS = ['KickMembers', 'BanMembers', 'ModerateMembers', 'ManageMessages'];

function baseContext(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return {
    tier: 'standard',
    hardcoded: false,
    devId: 1,
    buildId: 1,
    visibility: 'public',
    releaseStatus: 'public',
    actorId: 'user-1',
    botOwnerIds: ['owner-1'],
    isDM: false,
    allowedInDM: false,
    guildId: 'guild-1',
    blacklist: {
      isGloballyBlacklisted: () => false,
      isGuildBlacklisted: () => false,
    },
    availability: { guildKnown: true, moduleActive: true },
    botPermissions: ['SEND_MESSAGES', 'BAN_MEMBERS'],
    requiredBotPermissions: [],
    memberPermissions: [],
    requiredMemberPermissions: [],
    rankInput: { isGuildOwner: false, restricted: false },
    requiredRank: null,
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [],
    },
    hasExplicitPermissionDeclaration: true,
    channel: { id: 'chan-1', categoryId: 'cat-1', isNsfw: false },
    requiresNsfw: false,
    channelLocks: {},
    ...overrides,
  };
}

test('layer 1: a process owner bypasses every other layer', () => {
  const ctx = baseContext({
    actorId: 'owner-1',
    blacklist: { isGloballyBlacklisted: () => true, isGuildBlacklisted: () => true },
    requiredMemberPermissions: ['ADMINISTRATOR'],
    memberPermissions: [],
  });
  expect(resolvePermission(ctx)).toStrictEqual({ allowed: true });
});

test('layer 2: a globally blacklisted user is denied at layer 2', () => {
  const ctx = baseContext({
    blacklist: { isGloballyBlacklisted: () => true, isGuildBlacklisted: () => false },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(2);
});

test('layer 2: a guild-blacklisted user is denied at layer 2', () => {
  const ctx = baseContext({
    blacklist: { isGloballyBlacklisted: () => false, isGuildBlacklisted: () => true },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(2);
});

test('layer 2: blacklist fails closed when the list is unavailable', () => {
  const result = resolvePermission(baseContext({ blacklistAvailable: false }));
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(2);
});

test('layer 3: DM usage is denied when the action does not allow DMs', () => {
  const ctx = baseContext({ isDM: true, allowedInDM: false });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(3);
});

test('layer 3: DM usage passes through when explicitly sanctioned for DMs', () => {
  const ctx = baseContext({ isDM: true, allowedInDM: true, guildId: null });
  expect(resolvePermission(ctx).allowed).toBe(true);
});

test('layer 3: an unknown guild is denied — fail closed', () => {
  const result = resolvePermission(
    baseContext({ availability: { guildKnown: false, moduleActive: true } }),
  );
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(3);
});

test('layer 3: an inactive module is denied — fail closed', () => {
  const result = resolvePermission(
    baseContext({ availability: { guildKnown: true, moduleActive: false } }),
  );
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(3);
});

test('bot capability: missing bot permissions deny even when a permit grant applies', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    requiredBotPermissions: ['KICK_MEMBERS'],
    botPermissions: ['SEND_MESSAGES'],
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.reason ?? '').toMatch(/KICK_MEMBERS/);
});

test('layer 7: a permit grant overrides a Layer 4–6 denial for a module command', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    requiredRank: 'MODERATOR',
    requiresNsfw: true,
    requiredMemberPermissions: ['MANAGE_GUILD'],
    channelLocks: { blockedChannelIds: ['chan-1'] },
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  expect(resolvePermission(ctx)).toStrictEqual({ allowed: true });
});

test('layer 7: a module-wide grant ("<module>.*") applies to its command keys', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.*',
  };
  const ctx = baseContext({
    requiredRank: 'MODERATOR',
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  expect(resolvePermission(ctx)).toStrictEqual({ allowed: true });
});

test('layer 7: a blacklist grant denies even when the member otherwise qualifies', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'blacklist',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    requiredRank: 'ADMINISTRATOR',
    memberPermissions: ['Administrator'],
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(7);
  expect(result.reason).toBe('a Layer 7 grant denies this target');
});

test('layer 7: grants never reach core commands', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'core.health',
  };
  const ctx = baseContext({
    tier: 'core',
    hardcoded: false,
    devId: 1,
    buildId: 1,
    visibility: 'public',
    releaseStatus: 'public',
    grants: {
      commandKey: 'core.health',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  const denied = resolvePermission({
    ...ctx,
    hasExplicitPermissionDeclaration: false,
  });
  expect(denied.allowed).toBe(false);
  expect(denied.reason).toBe('no explicit permission declaration exists for this action');

  expect(resolvePermission({ ...ctx, hasExplicitPermissionDeclaration: true })).toStrictEqual({
    allowed: true,
  });
});

test('layer 7: an active whitelist restricts a command to whitelisted targets only', () => {
  const whitelisted = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'whitelist',
    key: 'moderation.ban',
  };
  const other = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-2',
    type: 'whitelist',
    key: 'moderation.ban',
  };

  const allowed = resolvePermission(
    baseContext({
      requiredRank: 'MODERATOR',
      grants: {
        commandKey: 'moderation.ban',
        membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
        guildGrants: [whitelisted],
      },
    }),
  );
  expect(allowed).toStrictEqual({ allowed: true });

  const denied = resolvePermission(
    baseContext({
      grants: {
        commandKey: 'moderation.ban',
        membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
        guildGrants: [other],
      },
    }),
  );
  expect(denied.allowed).toBe(false);
  expect(denied.reason).toBe('this command is whitelist-only and this target is not whitelisted');
});

test('layer 7: a permit grant cannot lift the RESTRICTED floor', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    requiredRank: 'MEMBER',
    rankInput: { isGuildOwner: false, restricted: true },
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(6);
  expect(result.reason).toBe('requires RBAC rank MEMBER, actor has RESTRICTED');
});

test('layer 4: NSFW-only action denied in a non-NSFW channel', () => {
  const ctx = baseContext({
    requiresNsfw: true,
    channel: { id: 'c', categoryId: null, isNsfw: false },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(4);
});

test('layer 4: an explicitly blocked channel is denied', () => {
  const ctx = baseContext({ channelLocks: { blockedChannelIds: ['chan-1'] } });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(4);
});

test('layer 4: an allow-list that excludes the current channel is denied', () => {
  const ctx = baseContext({ channelLocks: { allowedChannelIds: ['some-other-channel'] } });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(4);
});

test('layer 5: missing member permissions are denied with the specific names', () => {
  const ctx = baseContext({ requiredMemberPermissions: ['MANAGE_GUILD'] });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(5);
  expect(result.reason ?? '').toMatch(/MANAGE_GUILD/);
});

test('layer 6: the rank is evaluated from live bits — MOD bundle satisfies a MODERATOR requirement', () => {
  const ctx = baseContext({
    requiredRank: 'MODERATOR',
    memberPermissions: MOD_BITS,
  });
  expect(resolvePermission(ctx)).toStrictEqual({ allowed: true });
});

test('layer 6: an unqualified member is denied a MODERATOR-gated command', () => {
  const ctx = baseContext({ requiredRank: 'MODERATOR', memberPermissions: ['SEND_MESSAGES'] });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(6);
  expect(result.reason).toBe('requires RBAC rank MODERATOR, actor has MEMBER');
});

test('layer 6: the guild ownership account resolves to the OWNER rank', () => {
  const ctx = baseContext({
    requiredRank: 'OWNER',
    rankInput: { isGuildOwner: true, restricted: false },
    memberPermissions: [],
  });
  expect(resolvePermission(ctx)).toStrictEqual({ allowed: true });
});

test('layer 6: ADMIN bundle satisfies an OWNER-gated command only for the guild owner', () => {
  const ctx = baseContext({
    requiredRank: 'OWNER',
    memberPermissions: ['Administrator'],
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe('requires RBAC rank OWNER, actor has ADMINISTRATOR');
});

test('layer 6: Core tier is exempt from RBAC even without the required rank', () => {
  const ctx = baseContext({
    tier: 'core',
    hardcoded: false,
    devId: 1,
    buildId: 1,
    visibility: 'public',
    releaseStatus: 'public',
    requiredRank: 'MODERATOR',
    memberPermissions: [],
  });
  expect(resolvePermission(ctx).allowed).toBe(true);
});

test('a fully-permitted standard action with no restrictions is allowed', () => {
  expect(resolvePermission(baseContext())).toStrictEqual({ allowed: true });
});

test('default deny: a non-owner action without a permission declaration is denied', () => {
  const result = resolvePermission(baseContext({ hasExplicitPermissionDeclaration: false }));
  expect(result.allowed).toBe(false);
  expect(result.reason).toBe('no explicit permission declaration exists for this action');
});

test('layers short-circuit in order: a layer-2 failure never reaches layer 7 checks', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    tier: 'standard',
    hardcoded: false,
    devId: 1,
    buildId: 1,
    visibility: 'public',
    releaseStatus: 'public',
    blacklist: { isGloballyBlacklisted: () => true, isGuildBlacklisted: () => false },
    requiredRank: 'OWNER',
    requiresNsfw: true,
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  expect(resolvePermission(ctx).layerIndex).toBe(2);
});

test('layers short-circuit in order: an unavailable module never reaches layer 4–7', () => {
  const grant = {
    guildId: 'guild-1',
    level: 'role',
    refId: 'role-1',
    type: 'permit',
    key: 'moderation.ban',
  };
  const ctx = baseContext({
    availability: { guildKnown: true, moduleActive: false },
    requiresNsfw: true,
    grants: {
      commandKey: 'moderation.ban',
      membership: { roleIds: ['role-1'], groupIds: [], setIds: [] },
      guildGrants: [grant],
    },
  });
  expect(resolvePermission(ctx).layerIndex).toBe(3);
});

test('AdminTierGate allows only bot owners and always requires an audit record', () => {
  const owners = ['owner-1', 'owner-2'];
  const allowed = checkAdminTierGate('owner-2', owners);
  const denied = checkAdminTierGate('random-user', owners);
  expect(allowed.allowed).toBe(true);
  expect(denied.allowed).toBe(false);
  expect(allowed.mustAudit).toBe(true);
  expect(denied.mustAudit).toBe(true);
  expect(denied.silentRejectionMessage).toBe(allowed.silentRejectionMessage);
});
