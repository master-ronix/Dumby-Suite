import { test, expect, vi, describe } from 'vitest';
import { Routes } from 'discord.js';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandDeployer } from '../../src/commands/command-deployer.js';
import { ModuleRegistry, type LoadedModule } from '../../src/module-system/registry.js';
import { ModuleLoader } from '../../src/module-system/loader.js';
import type { Logger } from '../../src/logging/logger.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';

function fakeLogger(): Logger {
  const noop = (): void => undefined;
  return {
    child: () => fakeLogger(),
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    setLevel: noop,
  } as unknown as Logger;
}

function fakeManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    name: 'test-module',
    version: '1.0.0',
    description: 'test module',
    tier: 'core',
    hardcoded: false,
    required: false,
    depends: [],
    provides: [],
    intents: [],
    partials: [],
    commands: [],
    events: [],
    services: [],
    repositories: [],
    jobs: [],
    tasks: [],
    routes: [],
    middleware: [],
    migrations: [],
    locales: ['en-US'],
    config: {},
    eventsCatalog: [],
    crossModuleReads: [],
    ...overrides,
  } as ModuleManifest;
}

describe('module command-registration surface (F1)', () => {
  test('ModuleLoader.loadAll invokes a module registerCommands hook', async () => {
    const registry = new ModuleRegistry();
    const container = new Container();
    const commandRegistry = new CommandRegistry();
    container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);

    const mod: LoadedModule = {
      manifest: fakeManifest({ name: 'health', tier: 'core' }),
      registerCommands: (reg) => {
        reg.register({
          data: { name: 'health', description: 'Ping latency and system health information.' },
          execute: async () => undefined,
          moduleId: 'health',
        });
      },
    };
    registry.register(mod);

    const loader = new ModuleLoader(registry, container, fakeLogger());
    await loader.loadAll();

    expect(commandRegistry.count()).toBe(1);
    expect(commandRegistry.get('health')?.moduleId).toBe('health');
    expect(commandRegistry.getModuleTier('health')).toBe('core');
  });

  test('ModuleLoader.loadAll tolerates a module with no registerCommands hook', async () => {
    const registry = new ModuleRegistry();
    const container = new Container();
    const commandRegistry = new CommandRegistry();
    container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
    registry.register({ manifest: fakeManifest({ name: 'dashboard', tier: 'core' }) });

    const loader = new ModuleLoader(registry, container, fakeLogger());
    await loader.loadAll();
    expect(commandRegistry.count()).toBe(0);
  });
});

describe('CommandDeployer clears stale commands on an empty registry (F3)', () => {
  const config = { botToken: 'token', applicationId: '1234567890', devGuildId: '9876543210', nodeEnv: 'test' };

  test('deploy() clears application commands even when nothing is registered', async () => {
    const registry = new CommandRegistry();
    const logger = fakeLogger();
    const put = vi.fn().mockResolvedValue(undefined);
    const deployer = new CommandDeployer({ registry, logger, config, rest: { put } });

    await deployer.deploy();

    expect(put).toHaveBeenCalledWith(Routes.applicationCommands(config.applicationId), { body: [] });
  });
});
