import { test, expect } from 'vitest';
import { Container } from '../../src/di/container.js';
import {
  ModuleRegistry,
  ModuleAlreadyRegisteredError,
  type LoadedModule,
} from '../../src/module-system/registry.js';
import {
  ModuleLoader,
  ModuleValidationFailedError,
  FatalModuleLoadError,
} from '../../src/module-system/loader.js';
import type { Logger } from '../../src/logging/logger.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';
import {
  loadModulesFromTierVolumes,
  loadModulesFromSwastikVolume,
  MODULE_VOLUME_NAMES,
} from '../../src/module-system/swastik-loader.js';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface FakeLogger extends Logger {
  calls: Array<{ level: string; msg: string; ctx: unknown }>;
}

function fakeLogger(): FakeLogger {
  const calls: Array<{ level: string; msg: string; ctx: unknown }> = [];
  const record =
    (level: string) =>
    (msg: string, ctx: unknown = {}) => {
      calls.push({ level, msg, ctx });
    };
  return {
    calls,
    child: () => fakeLogger(),
    trace: record('trace'),
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    fatal: record('fatal'),
    setLevel: () => undefined,
  } as unknown as FakeLogger;
}

function fakeManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    name: 'test-module',
    version: '1.0.0',
    description: 'test module',
    tier: 'standard',
    hardcoded: false,
    devId: 'dev_first_party',
    buildId: 'build_test_1_0_0',
    visibility: 'public',
    releaseStatus: 'public',
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

test('ModuleRegistry stores and retrieves modules by name', () => {
  const registry = new ModuleRegistry();
  const mod: LoadedModule = { manifest: fakeManifest({ name: 'utility' }) };
  registry.register(mod);
  expect(registry.has('utility')).toBe(true);
  expect(registry.get('utility')).toBe(mod);
  expect(registry.count()).toBe(1);
});

test('ModuleRegistry rejects registering the same module name twice', () => {
  const registry = new ModuleRegistry();
  registry.register({ manifest: fakeManifest({ name: 'utility' }) });
  expect(() => registry.register({ manifest: fakeManifest({ name: 'utility' }) })).toThrow(
    ModuleAlreadyRegisteredError,
  );
});

function writeVolumeModule(
  modulesDir: string,
  volumeName: string,
  moduleName: string,
  manifestOverrides: Partial<ModuleManifest>,
): void {
  const moduleRoot = join(modulesDir, volumeName, moduleName);
  mkdirSync(moduleRoot, { recursive: true });
  writeFileSync(
    join(moduleRoot, 'manifest.json'),
    JSON.stringify(fakeManifest({ name: moduleName, ...manifestOverrides })),
  );
  writeFileSync(join(moduleRoot, 'index.js'), 'export const onLoad = () => undefined;\n');
  // §30 — en-US.json is mandatory; Stage 11 fails without it.
  mkdirSync(join(moduleRoot, 'locales'), { recursive: true });
  writeFileSync(join(moduleRoot, 'locales', 'en-US.json'), '{}');
}

test('loadModulesFromTierVolumes blindly discovers modules from all configured tier volumes', async () => {
  const registry = new ModuleRegistry();
  const modulesDir = mkdtempSync(join(tmpdir(), 'dumby-modules-'));
  for (const volumeName of MODULE_VOLUME_NAMES) {
    mkdirSync(join(modulesDir, volumeName), { recursive: true });
  }
  writeVolumeModule(modulesDir, 'modules-admin', 'core-admin', {
    tier: 'admin',
    hardcoded: false,
    devGuildOnly: true,
    devId: 'dev_first_party',
    buildId: 'build_test_1_0_0',
    visibility: 'public',
    releaseStatus: 'public',
  });
  writeVolumeModule(modulesDir, 'modules-core', 'utility', { tier: 'core' });
  writeVolumeModule(modulesDir, 'modules-standard', 'polls', { tier: 'standard' });
  writeVolumeModule(modulesDir, 'modules-marketplace', 'music', {
    tier: 'marketplace',
    hardcoded: false,
    marketplaceCategory: 'utility',
    devId: 'dev_first_party',
    buildId: 'build_test_1_0_0',
    visibility: 'public',
    releaseStatus: 'public',
    marketplaceCategory: 'audio',
  });

  const result = await loadModulesFromTierVolumes({
    modulesDir,
    registry,
    logger: fakeLogger(),
  });

  expect(result.loaded).toStrictEqual(['core-admin', 'utility', 'polls', 'music']);
  expect(result.failed).toStrictEqual([]);
  expect(registry.get('core-admin')?.manifest.tier).toBe('admin');
  expect(registry.get('utility')?.manifest.tier).toBe('core');
  expect(registry.get('polls')?.manifest.tier).toBe('standard');
  expect(registry.get('music')?.manifest.tier).toBe('marketplace');
});

test('loadModulesFromTierVolumes does not discover modules outside the named volume set', async () => {
  const registry = new ModuleRegistry();
  const modulesDir = mkdtempSync(join(tmpdir(), 'dumby-modules-'));
  mkdirSync(join(modulesDir, 'random-modules'), { recursive: true });
  writeVolumeModule(modulesDir, 'random-modules', 'rogue', { tier: 'core' });

  const result = await loadModulesFromTierVolumes({
    modulesDir,
    registry,
    logger: fakeLogger(),
  });

  expect(result.loaded).toStrictEqual([]);
  expect(registry.has('rogue')).toBe(false);
});

test('loadModulesFromTierVolumes enforces tier-at-rest by volume placement', async () => {
  const registry = new ModuleRegistry();
  const modulesDir = mkdtempSync(join(tmpdir(), 'dumby-modules-'));
  mkdirSync(join(modulesDir, 'modules-standard'), { recursive: true });
  writeVolumeModule(modulesDir, 'modules-standard', 'wrong-place', { tier: 'core' });

  await expect(() =>
    loadModulesFromTierVolumes({
      modulesDir,
      registry,
      logger: fakeLogger(),
    }),
  ).rejects.toThrow('modules-standard/wrong-place');
});

test('loadModulesFromSwastikVolume remains an alias for tier-volume discovery', async () => {
  const registry = new ModuleRegistry();
  const modulesDir = mkdtempSync(join(tmpdir(), 'dumby-modules-'));
  mkdirSync(join(modulesDir, 'modules-core'), { recursive: true });
  writeVolumeModule(modulesDir, 'modules-core', 'utility', { tier: 'core' });

  const result = await loadModulesFromSwastikVolume({
    modulesDir,
    registry,
    logger: fakeLogger(),
  });

  expect(result.loaded).toStrictEqual(['utility']);
});

test('ModuleLoader.validateAll throws ModuleValidationFailedError for a bad manifest', () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'sneaky-admin', tier: 'admin', devGuildOnly: false }),
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  expect(() => loader.validateAll()).toThrow(ModuleValidationFailedError);
});

test('ModuleLoader.validateAll passes for a well-formed set of modules', () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'guild-settings', tier: 'core', required: true }),
  });
  registry.register({ manifest: fakeManifest({ name: 'utility', tier: 'core', required: true }) });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  expect(() => loader.validateAll()).not.toThrow();
});

test('ModuleLoader.loadAll calls onLoad in dependency order', async () => {
  const registry = new ModuleRegistry();
  const calls: string[] = [];
  registry.register({
    manifest: fakeManifest({
      name: 'guild-settings',
      required: true,
      provides: [{ token: 'guild-settings:store', contract: 'GuildSettingsStore' }],
    }),
    onLoad: () => {
      calls.push('guild-settings');
    },
  });
  registry.register({
    manifest: fakeManifest({
      name: 'economy',
      depends: [{ token: 'guild-settings:store', version: '^1.0.0' }],
      required: false,
    }),
    onLoad: () => {
      calls.push('economy');
    },
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  const report = await loader.loadAll();
  expect(calls).toStrictEqual(['guild-settings', 'economy']);
  expect(report.order).toStrictEqual(['guild-settings', 'economy']);
  expect(report.fatal).toStrictEqual([]);
  expect(report.degraded).toStrictEqual([]);
});

test('ModuleLoader.loadAll throws FatalModuleLoadError when a required module fails onLoad', async () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'guild-settings', required: true }),
    onLoad: () => {
      throw new Error('boom');
    },
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  await expect(() => loader.loadAll()).rejects.toThrow(FatalModuleLoadError);
});

test('ModuleLoader.loadAll degrades (does not throw) when an optional module fails onLoad', async () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'fun', required: false }),
    onLoad: () => {
      throw new Error('boom');
    },
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  const report = await loader.loadAll();
  expect(report.degraded).toStrictEqual(['fun']);
  expect(report.fatal).toStrictEqual([]);
});

test('ModuleLoader.readyAll never throws and reports optional ready failures separately', async () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'utility', required: false }),
    onReady: () => {
      throw new Error('ready failure');
    },
  });
  const logger = fakeLogger();
  const loader = new ModuleLoader(registry, new Container(), logger);
  const report = await loader.readyAll(['utility']);
  expect(report.failed).toStrictEqual(['utility']);
  expect(report.requiredFailed).toStrictEqual([]);
  expect(
    logger.calls.some((c) => c.level === 'error' && c.msg === 'module-ready-failed-non-fatal'),
  ).toBe(true);
});

test('ModuleLoader.readyAll reports required ready failures for readiness gating', async () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'core-admin', required: true }),
    onReady: () => {
      throw new Error('ready failure');
    },
  });
  registry.register({
    manifest: fakeManifest({ name: 'utility', required: false }),
    onReady: () => {
      throw new Error('ready failure');
    },
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  const report = await loader.readyAll(['core-admin', 'utility']);
  expect(report.failed).toStrictEqual(['core-admin', 'utility']);
  expect(report.requiredFailed).toStrictEqual(['core-admin']);
});

test('ModuleLoader.unloadAll calls onUnload in REVERSE load order', async () => {
  const registry = new ModuleRegistry();
  const calls: string[] = [];
  registry.register({
    manifest: fakeManifest({ name: 'a' }),
    onUnload: () => void calls.push('a'),
  });
  registry.register({
    manifest: fakeManifest({ name: 'b' }),
    onUnload: () => void calls.push('b'),
  });
  registry.register({
    manifest: fakeManifest({ name: 'c' }),
    onUnload: () => void calls.push('c'),
  });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  await loader.unloadAll(['a', 'b', 'c']);
  expect(calls).toStrictEqual(['c', 'b', 'a']);
});
