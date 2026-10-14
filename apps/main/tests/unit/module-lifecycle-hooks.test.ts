import { test, expect, describe, vi } from 'vitest';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';

/**
 * UR-20261012-071 — §11.7 declares `onEnable` / `onDisable` as the hooks a module uses to START and
 * STOP its own active processes on the DISABLED ↔ ENABLED transitions. The SDK declared neither, so a
 * module could not implement the hooks the specification gives it, and the framework never told a
 * module to stop what it had started.
 *
 * These are GLOBAL transitions (load, shutdown), not per-guild ones — §13.7 says a per-guild toggle
 * "never touches the module's loaded state, DI registrations, or event subscriptions", so a module
 * disabled in ONE guild must not stop a process other guilds still depend on. That case belongs to
 * the execution gates (UR-20261012-069), and these tests pin the distinction.
 */

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

function manifestOf(name: string): ModuleManifest {
  return {
    name,
    tier: 'standard',
    version: '1.0.0',
    description: 'test',
    required: false,
    commands: [],
    provides: [],
    depends: [],
    events: [],
    services: [],
    repositories: [],
    jobs: [],
    tasks: [],
    routes: [],
    middleware: [],
    migrations: [],
    locales: [],
    config: {},
    intents: [],
    partials: [],
  } as unknown as ModuleManifest;
}

function makeLoader(module: Record<string, unknown>) {
  const registry = new ModuleRegistry();
  registry.register({ manifest: manifestOf('m'), ...module } as never);
  const log = logger();
  const container = { tryResolve: () => undefined };
  const loader = new ModuleLoader(registry, container as never, log as never);
  return { loader, log };
}

describe('onEnable fires on the DISABLED → ENABLED transition (UR-20261012-071)', () => {
  test('it runs AFTER onReady, so a module starts its processes once the gateway is up', async () => {
    const order: string[] = [];
    const { loader } = makeLoader({
      onReady: () => {
        order.push('onReady');
      },
      onEnable: () => {
        order.push('onEnable');
      },
    });
    await loader.loadAll();
    await loader.readyAll(['m']);

    expect(order).toEqual(['onReady', 'onEnable']);
  });

  test('a throw leaves the module DISABLED and is reported as a failure', async () => {
    const { loader, log } = makeLoader({
      onEnable: () => {
        throw new Error('polling loop refused to start');
      },
    });
    await loader.loadAll();
    const report = await loader.readyAll(['m']);

    expect(report.failed).toContain('m');
    expect(log.error).toHaveBeenCalled();
  });

  test('a module without the hook is unaffected', async () => {
    const { loader } = makeLoader({});
    await loader.loadAll();
    const report = await loader.readyAll(['m']);
    expect(report.failed).toEqual([]);
  });
});

describe('onDisable fires on the ENABLED → DISABLED transition (UR-20261012-071)', () => {
  test('it runs BEFORE onUnload, as §11.7 requires', async () => {
    const order: string[] = [];
    const { loader } = makeLoader({
      onDisable: () => {
        order.push('onDisable');
      },
      onUnload: () => {
        order.push('onUnload');
      },
    });
    await loader.loadAll();
    await loader.unloadAll(['m']);

    expect(order).toEqual(['onDisable', 'onUnload']);
  });

  test('a throw is logged but the module STILL unloads — never left half-stopped', async () => {
    const unloaded = vi.fn();
    const { loader, log } = makeLoader({
      onDisable: () => {
        throw new Error('could not close the connection');
      },
      onUnload: unloaded,
    });
    await loader.loadAll();
    await loader.unloadAll(['m']);

    expect(log.error).toHaveBeenCalled();
    expect(unloaded).toHaveBeenCalledTimes(1);
  });

  test('every module is disabled in reverse load order, so dependents stop first', async () => {
    const order: string[] = [];
    const registry = new ModuleRegistry();
    registry.register({
      manifest: manifestOf('a'),
      onDisable: () => {
        order.push('a');
      },
    } as never);
    registry.register({
      manifest: manifestOf('b'),
      onDisable: () => {
        order.push('b');
      },
    } as never);
    const loader = new ModuleLoader(
      registry,
      { tryResolve: () => undefined } as never,
      logger() as never,
    );

    await loader.unloadAll(['a', 'b']);

    expect(order).toEqual(['b', 'a']);
  });
});
