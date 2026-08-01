import { test, expect } from 'vitest';
import { resolvePermission, type PermissionContext } from '../../src/permissions/resolver.js';
import { checkAdminTierGate } from '../../src/permissions/admin-tier-gate.js';

function baseContext(overrides: Partial<PermissionContext> = {}): PermissionContext {
  return {
    tier: 'standard',
    actorId: 'user-1',
    botOwnerIds: ['owner-1'],
    isDM: false,
    allowedInDM: false,
    guildId: 'guild-1',
    blacklist: {
      isGloballyBlacklisted: () => false,
      isGuildBlacklisted: () => false,
    },
    botPermissions: ['SEND_MESSAGES', 'BAN_MEMBERS'],
    requiredBotPermissions: [],
    memberPermissions: ['SEND_MESSAGES'],
    requiredMemberPermissions: [],
    rbac: { highestEffectiveRole: 'MEMBER', requiredRole: null },
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

test('layer 4: missing bot permissions are denied with the specific permission names', () => {
  const ctx = baseContext({
    requiredBotPermissions: ['BAN_MEMBERS', 'KICK_MEMBERS'],
    botPermissions: ['BAN_MEMBERS'],
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(4);
  expect(result.reason ?? '').toMatch(/KICK_MEMBERS/);
});

test('layer 5: missing member permissions are denied', () => {
  const ctx = baseContext({ requiredMemberPermissions: ['MANAGE_GUILD'] });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(5);
});

test('layer 6: RBAC requirement enforced for a standard-tier action', () => {
  const ctx = baseContext({
    tier: 'standard',
    rbac: { highestEffectiveRole: 'MEMBER', requiredRole: 'MOD' },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(6);
});

test('layer 6: Core tier is exempt from RBAC even without the required role', () => {
  const ctx = baseContext({
    tier: 'core',
    rbac: { highestEffectiveRole: 'MEMBER', requiredRole: 'MOD' },
  });
  expect(resolvePermission(ctx).allowed).toBe(true);
});

test('layer 7: NSFW-only action denied in a non-NSFW channel', () => {
  const ctx = baseContext({
    requiresNsfw: true,
    channel: { id: 'c', categoryId: null, isNsfw: false },
  });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(7);
});

test('layer 7: an explicitly blocked channel is denied', () => {
  const ctx = baseContext({ channelLocks: { blockedChannelIds: ['chan-1'] } });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(7);
});

test('layer 7: an allow-list that excludes the current channel is denied', () => {
  const ctx = baseContext({ channelLocks: { allowedChannelIds: ['some-other-channel'] } });
  const result = resolvePermission(ctx);
  expect(result.allowed).toBe(false);
  expect(result.layerIndex).toBe(7);
});

test('a fully-permitted standard action with no restrictions is allowed', () => {
  expect(resolvePermission(baseContext())).toStrictEqual({ allowed: true });
});

test('layers short-circuit in order: a layer-2 failure never reaches layer 6/7 checks', () => {
  const ctx = baseContext({
    blacklist: { isGloballyBlacklisted: () => true, isGuildBlacklisted: () => false },
    rbac: { highestEffectiveRole: 'RESTRICTED', requiredRole: 'OWNER' },
    requiresNsfw: true,
  });
  expect(resolvePermission(ctx).layerIndex).toBe(2);
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
