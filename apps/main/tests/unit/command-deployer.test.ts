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
});
