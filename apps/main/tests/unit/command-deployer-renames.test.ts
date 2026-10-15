import { describe, expect, test, vi } from 'vitest';
import { CommandDeployer } from '../../src/commands/command-deployer.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import type { Logger } from '../../src/logging/logger.js';

const logger = (): Logger =>
  ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) as unknown as Logger;

describe('the deployer registers the RENAMED set (UR-20261012-063)', () => {
  test('an applied rename survives a boot instead of being reverted to the registry name', async () => {
    // The defect: the deployer registered the registry's names at every boot, so a BCCM rename applied
    // on a queue window was undone by the next restart — the operator saw the old name, then the new
    // one, then neither. The applied rename lives in `guild_command_renames`; the deployer must read it.
    const registry = new CommandRegistry();
    registry.registerModule('hello-world', 'standard');
    registry.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: async () => {},
    } as never);

    const puts: Array<{ route: string; body: unknown[] }> = [];
    const rest = {
      put: async (route: string, options: { body: unknown[] }) => {
        puts.push({ route, body: options.body });
        return undefined;
      },
      get: async () => [],
    };

    const deployer = new CommandDeployer({
      registry,
      logger: logger(),
      config: {
        applicationId: 'app-1',
        devGuildId: '',
        nodeEnv: 'production',
      } as never,
      rest: rest as never,
      enabledGuildResolver: async () => ['g1'],
      commandRenames: async () => new Map([['hello', 'namaste']]),
    });

    await deployer.deploy();

    // The guild's registration carries the RENAMED name, with the source's real definition.
    const guildPut = puts.filter((p) => p.route.includes('/guilds/g1/commands')).at(-1);
    const body = JSON.stringify(guildPut?.body ?? []);
    expect(body).toContain('namaste');
    expect(body).not.toContain('"name":"hello"');
    expect(body).toContain('Says hello');
  });
});
