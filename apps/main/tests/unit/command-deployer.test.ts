import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandDeployer } from '../../src/commands/command-deployer.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';

function makeLogger() {
  return { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), child: vi.fn() };
}

const config = {
  botToken: 'token',
  applicationId: '1234567890',
  devGuildId: '9876543210',
  nodeEnv: 'test',
};

describe('CommandDeployer', () => {
  test('deploy() logs a skip message when no commands are registered', async () => {
    const registry = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    expect(logger.info).toHaveBeenCalledWith('command-deployer-skip', expect.objectContaining({ reason: 'no commands registered' }));
  });

  test('deploy() logs start and complete when commands are registered', async () => {
    const registry = new CommandRegistry();
    registry.register({ data: { name: 'health', description: 'Health check' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    expect(logger.info).toHaveBeenCalledWith('command-deployer-start', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('command-deployer-complete', expect.any(Object));
  });

  test('deploy() includes commandCount in the log context', async () => {
    const registry = new CommandRegistry();
    registry.register({ data: { name: 'hello', description: 'H' }, execute: async () => {}, moduleId: 'core' });
    registry.register({ data: { name: 'ping', description: 'P' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await deployer.deploy();
    const startCall = vi.mocked(logger.info).mock.calls.find(([msg]) => msg === 'command-deployer-start');
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
    registry.register({ data: { name: 'health', description: 'H' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const deployer = new CommandDeployer({ registry, logger, config });
    await expect(deployer.deploy()).resolves.toBeUndefined();
  });

  test('deploy() bulk-overwrites the global command list when rest is provided', async () => {
    const registry = new CommandRegistry();
    registry.register({ data: { name: 'health', description: 'Health check' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config: { ...config, devGuildId: '' }, rest: { put } });
    await deployer.deploy();
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith('/applications/1234567890/commands', { body: registry.toApiPayloads() });
  });

  test('deploy() also mirrors to the dev guild when devGuildId is configured', async () => {
    const registry = new CommandRegistry();
    registry.register({ data: { name: 'health', description: 'Health check' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });
    await deployer.deploy();
    expect(put).toHaveBeenCalledTimes(2);
    expect(put).toHaveBeenNthCalledWith(1, '/applications/1234567890/commands', expect.any(Object));
    expect(put).toHaveBeenNthCalledWith(2, '/applications/1234567890/guilds/9876543210/commands', expect.any(Object));
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
    expect(put).toHaveBeenCalledWith('/applications/1234567890/guilds/9876543210/commands', { body: [] });
  });
});
