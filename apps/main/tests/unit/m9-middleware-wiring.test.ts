import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * UR-A-03 / finding #3 — four of the twelve built-in middlewares were neutered by hardcoded stub
 * resolvers at construction. They now read live sources: the command's metadata from the registry
 * and the member's Discord state from the gateway client.
 */
const bootstrap = readFileSync(
  fileURLToPath(new URL('../../src/bootstrap/bootstrap.ts', import.meta.url)),
  'utf8',
);

describe('M9 finding #3 — the built-in middlewares are wired', () => {
  test('the stubs are gone', () => {
    expect(bootstrap).not.toMatch(/getMemberPermissions: async \(\) => \[\]/);
    expect(bootstrap).not.toMatch(/getRequiredPermissions: \(\) => \[\]/);
    expect(bootstrap).not.toMatch(/getHighestRole: async \(\) => null/);
    expect(bootstrap).not.toMatch(/getRequiredRole: \(\) => null/);
    expect(bootstrap).not.toMatch(/getCooldownMs: \(\) => 0/);
    expect(bootstrap).not.toMatch(/requiresDefer: \(\) => false/);
  });

  test('the permission and RBAC requirements come from the command registry', () => {
    expect(bootstrap).toMatch(/getRequiredPermissions: \(commandName\) =>/);
    expect(bootstrap).toMatch(/permissions\?\.discord/);
    expect(bootstrap).toMatch(/getRequiredRole: \(commandName\) =>/);
    expect(bootstrap).toMatch(/permissions\?\.rbac/);
  });

  test('the cooldown and defer metadata come from the command registry', () => {
    expect(bootstrap).toMatch(/getCooldownMs: \(commandName\) => commandRegistry\.get\(commandName\)\?\.cooldownMs/);
    expect(bootstrap).toMatch(/requiresDefer: \(commandName\) => commandRegistry\.get\(commandName\)\?\.requiresDefer/);
    expect(bootstrap).toMatch(/isEphemeral: \(commandName\) => commandRegistry\.get\(commandName\)\?\.ephemeral/);
  });

  test('the member permission and role checks read live Discord state', () => {
    expect(bootstrap).toMatch(/getMemberPermissions: async \(userId, guildId\) =>/);
    expect(bootstrap).toMatch(/getHighestRole: async \(userId, guildId\) =>/);
    expect(bootstrap).toMatch(/discordClient\?\.guilds\.cache\.get\(guildId\)/);
  });
});
