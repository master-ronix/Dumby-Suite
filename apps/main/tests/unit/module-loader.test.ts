import { test, expect } from 'vitest';
import { Container } from '../../src/di/container.js';
import { ModuleRegistry, ModuleAlreadyRegisteredError, type LoadedModule } from '../../src/modules/registry.js';
import {
  ModuleLoader,
  ModuleValidationFailedError,
  FatalModuleLoadError,
} from '../../src/modules/loader.js';
import type { Logger } from '../../src/logging/logger.js';
import type { ModuleManifest } from '../../src/modules/manifest.schema.js';

interface FakeLogger extends Logger {
  calls: Array<{ level: string; msg: string; ctx: unknown }>;
}

function fakeLogger(): FakeLogger {
  const calls: Array<{ level: string; msg: string; ctx: unknown }> = [];
  const record = (level: string) => (msg: string, ctx: unknown = {}) => {
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
  expect(() => registry.register({ manifest: fakeManifest({ name: 'utility' }) })).toThrow(ModuleAlreadyRegisteredError);
});

test('ModuleLoader.validateAll throws ModuleValidationFailedError for a bad manifest', () => {
  const registry = new ModuleRegistry();
  registry.register({ manifest: fakeManifest({ name: 'sneaky-admin', tier: 'admin', devGuildOnly: false }) });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  expect(() => loader.validateAll()).toThrow(ModuleValidationFailedError);
});

test('ModuleLoader.validateAll passes for a well-formed set of modules', () => {
  const registry = new ModuleRegistry();
  registry.register({ manifest: fakeManifest({ name: 'guild-settings', tier: 'core', required: true }) });
  registry.register({ manifest: fakeManifest({ name: 'utility', tier: 'core', required: true }) });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  expect(() => loader.validateAll()).not.toThrow();
});

test('ModuleLoader.loadAll calls onLoad in dependency order', async () => {
  const registry = new ModuleRegistry();
  const calls: string[] = [];
  registry.register({
    manifest: fakeManifest({ name: 'guild-settings', required: true }),
    onLoad: () => {
      calls.push('guild-settings');
    },
  });
  registry.register({
    manifest: fakeManifest({ name: 'economy', depends: ['guild-settings'], required: false }),
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

test('ModuleLoader.readyAll never throws, even if onReady fails, and reports the failing modules', async () => {
  const registry = new ModuleRegistry();
  registry.register({
    manifest: fakeManifest({ name: 'utility' }),
    onReady: () => {
      throw new Error('ready failure');
    },
  });
  const logger = fakeLogger();
  const loader = new ModuleLoader(registry, new Container(), logger);
  const failures = await loader.readyAll(['utility']);
  expect(failures).toStrictEqual(['utility']);
  expect(logger.calls.some((c) => c.level === 'error' && c.msg === 'module-ready-failed-non-fatal')).toBeTruthy();
});

test('ModuleLoader.unloadAll calls onUnload in REVERSE load order', async () => {
  const registry = new ModuleRegistry();
  const calls: string[] = [];
  registry.register({ manifest: fakeManifest({ name: 'a' }), onUnload: () => void calls.push('a') });
  registry.register({ manifest: fakeManifest({ name: 'b' }), onUnload: () => void calls.push('b') });
  registry.register({ manifest: fakeManifest({ name: 'c' }), onUnload: () => void calls.push('c') });
  const loader = new ModuleLoader(registry, new Container(), fakeLogger());
  await loader.unloadAll(['a', 'b', 'c']);
  expect(calls).toStrictEqual(['c', 'b', 'a']);
});
