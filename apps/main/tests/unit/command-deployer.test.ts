import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandDeployer } from '../../src/commands/command-deployer.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';

function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
}

const config = {
  botToken: 'token',
  applicationId: '1234567890',
  devGuildId: '9876543210',
  nodeEnv: 'test',
};

describe('CommandDeployer', () => {
  function registerModule(registry: CommandRegistry, moduleId: string, tier: 'admin' | 'core' | 'standard' | 'marketplace'): void {
    registry.registerModule(moduleId, tier);
  }

  test('deploy() logs a skip message when no commands are registered', async () => {
    const registry = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    expect(logger.info).toHaveBeenCalledWith(
      'command-deployer-skip',
      expect.objectContaining({ reason: 'no commands registered' }),
    );
  });

  test('deploy() logs start and complete when commands are registered', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core', 'core');
    registry.register({
      data: { name: 'health', description: 'Health check' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    expect(logger.info).toHaveBeenCalledWith('command-deployer-start', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('command-deployer-complete', expect.any(Object));
  });

  test('deploy() includes commandCount in the log context', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core', 'core');
    registry.register({
      data: { name: 'hello', description: 'H' },
      execute: async () => {},
      moduleId: 'core',
    });
    registry.register({
      data: { name: 'ping', description: 'P' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    const startCall = vi
      .mocked(logger.info)
      .mock.calls.find(([msg]) => msg === 'command-deployer-start');
    expect(startCall?.[1]).toMatchObject({ commandCount: 2 });
  });

  test('undeploy() logs the undeploy message', async () => {
    const registry = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.undeploy();
    expect(logger.info).toHaveBeenCalledWith('command-deployer-undeploy', expect.any(Object));
  });

  test('deploy() makes no network calls when rest is absent (mock/test mode)', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core', 'core');
    registry.register({
      data: { name: 'health', description: 'H' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await expect(deployer.deploy()).resolves.toBeUndefined();
  });

  test('deploy() bulk-overwrites the global command list when rest is provided', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core', 'core');
    registry.register({
      data: { name: 'health', description: 'Health check' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({
      registry,
      logger,
      config: { ...config, devGuildId: '' },
      rest: { put },
    });
    await deployer.deploy();
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenNthCalledWith(1, '/applications/1234567890/commands', { body: [] });
    expect(put).toHaveBeenNthCalledWith(2, '/applications/1234567890/commands', {
      body: registry.toApiPayloads(),
    });
  });

  test('deploy() registers core commands globally even when devGuildId is configured', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core', 'core');
    registry.register({
      data: { name: 'health', description: 'Health check' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });
    await deployer.deploy();
    // Core tier is global by specification; the development guild is only for admin tier.
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenNthCalledWith(1, '/applications/1234567890/commands', { body: [] });
    expect(put).toHaveBeenNthCalledWith(
      2,
      '/applications/1234567890/commands',
      { body: registry.toApiPayloads() },
    );
  });

  test('deploy() registers admin commands only to the development guild', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'core-admin', 'admin');
    registry.register({
      data: { name: 'admin', description: 'Admin command' },
      execute: async () => {},
      moduleId: 'core-admin',
    });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });
    await deployer.deploy();
    expect(put).toHaveBeenCalledTimes(3);
    expect(put).toHaveBeenNthCalledWith(1, '/applications/1234567890/commands', { body: [] });
    expect(put).toHaveBeenNthCalledWith(2, '/applications/1234567890/guilds/9876543210/commands', {
      body: [],
    });
    expect(put).toHaveBeenNthCalledWith(3, '/applications/1234567890/guilds/9876543210/commands', {
      body: [expect.objectContaining({ name: 'admin', default_member_permissions: '0' })],
    });
  });

  test('deploy() registers standard commands only for enabled guilds', async () => {
    const registry = new CommandRegistry();
    registerModule(registry, 'utility', 'standard');
    registry.register({
      data: { name: 'utility', description: 'Utility command' },
      execute: async () => {},
      moduleId: 'utility',
    });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({
      registry,
      logger,
      config,
      rest: { put },
      enabledGuildResolver: async (moduleSlug) => (moduleSlug === 'utility' ? ['111', '222'] : []),
    });
    await deployer.deploy();
    expect(put).toHaveBeenCalledWith('/applications/1234567890/guilds/111/commands', {
      body: [registry.get('utility')?.data],
    });
    expect(put).toHaveBeenCalledWith('/applications/1234567890/guilds/222/commands', {
      body: [registry.get('utility')?.data],
    });
  });

  test('deploy() skips rest entirely when no commands are registered, even if rest is provided', async () => {
    const registry = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn();
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });
    await deployer.deploy();
    expect(put).not.toHaveBeenCalled();
  });

  test('undeploy() clears global and guild commands when rest is provided', async () => {
    const registry = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });
    await deployer.undeploy();
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenCalledWith('/applications/1234567890/commands', { body: [] });
    expect(put).toHaveBeenCalledWith('/applications/1234567890/guilds/9876543210/commands', {
      body: [],
    });
  });
});
