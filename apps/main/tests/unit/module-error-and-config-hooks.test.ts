import { test, expect, describe, vi } from 'vitest';
import { ModuleLoader } from '../../src/module-system/loader.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import { GuildConfigService } from '../../src/config/guild-config.service.js';
import type { ModuleManifest } from '../../src/module-system/manifest.schema.js';

/**
 * UR-20261012-072 — the last two hooks §11.7 declares and the SDK did not.
 *
 * `onError` — "cleanup on an unrecoverable error". The doctrine's own auto-disable threshold (10
 * errors in 60 s) is not implemented, so the honest trigger is the boundary the framework DOES have:
 * the point where it gives up on a module and marks it failed.
 *
 * `onConfigChange` — "react to a per-guild config change without a reload". That trigger is real and
 * narrow: a module's per-guild config being written.
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
  const loader = new ModuleLoader(registry, { tryResolve: () => undefined } as never, log as never);
  return { loader, log };
}

describe('onError fires where the framework gives up on a module (UR-20261012-072)', () => {
  test('a failing onLoad reports the error to the module', async () => {
    const seen: Error[] = [];
    const { loader } = makeLoader({
      onLoad: () => {
        throw new Error('cannot reach the database');
      },
      onError: (err: Error) => {
        seen.push(err);
      },
    });
    await loader.loadAll();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.message).toBe('cannot reach the database');
  });

  test('a failing onEnable reports the error too — the module is now DISABLED', async () => {
    const seen: Error[] = [];
    const { loader } = makeLoader({
      onEnable: () => {
        throw new Error('polling loop refused to start');
      },
      onError: (err: Error) => {
        seen.push(err);
      },
    });
    await loader.loadAll();
    await loader.readyAll(['m']);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.message).toBe('polling loop refused to start');
  });

  test('a throwing onError does NOT mask the original failure', async () => {
    const { loader, log } = makeLoader({
      onLoad: () => {
        throw new Error('original');
      },
      onError: () => {
        throw new Error('cleanup also failed');
      },
    });
    const report = await loader.loadAll();

    // §13.2 — a `required: false` module that fails DISABLES ALONE: degraded, not fatal. The load
    // still failed, and the cleanup failure is logged separately rather than masking it.
    expect(report.degraded).toContain('m');
    expect(report.fatal).toEqual([]);
    expect(log.error).toHaveBeenCalledWith(
      'module-error-hook-failed',
      expect.objectContaining({ module: 'm' }),
    );
  });

  test('a module without the hook is unaffected', async () => {
    const { loader } = makeLoader({});
    await loader.loadAll();
    const report = await loader.readyAll(['m']);
    expect(report.failed).toEqual([]);
  });
});

describe('onConfigChange fires on a per-guild config write (UR-20261012-072)', () => {
  test('the module is told the guild and the new config', async () => {
    const calls: Array<{ guildId: string; config: Record<string, unknown> }> = [];
    const { loader } = makeLoader({
      onConfigChange: (guildId: string, config: Record<string, unknown>) => {
        calls.push({ guildId, config });
      },
    });
    await loader.loadAll();
    await loader.notifyConfigChange('m', 'g-1', { greeting: 'namaste' });

    expect(calls).toEqual([{ guildId: 'g-1', config: { greeting: 'namaste' } }]);
  });

  test('an unknown module, or one without the hook, is a no-op', async () => {
    const { loader } = makeLoader({});
    await loader.loadAll();
    await expect(loader.notifyConfigChange('m', 'g-1', {})).resolves.toBeUndefined();
    await expect(loader.notifyConfigChange('nope', 'g-1', {})).resolves.toBeUndefined();
  });

  test('a throwing hook is caught, so a config write never fails because of it', async () => {
    const { loader, log } = makeLoader({
      onConfigChange: () => {
        throw new Error('cache refresh blew up');
      },
    });
    await loader.loadAll();
    await expect(loader.notifyConfigChange('m', 'g-1', {})).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(
      'module-config-change-hook-failed',
      expect.objectContaining({ module: 'm', guildId: 'g-1' }),
    );
  });
});

describe('the config service reaches the hook (UR-20261012-072)', () => {
  test('setModuleConfig notifies with the module slug, the guild, and the config', async () => {
    const store = {
      findByGuildId: vi.fn(async () => undefined),
      upsert: vi.fn(async () => undefined),
    };
    const cache = {
      get: vi.fn(async (_k: string, fn: () => Promise<unknown>) => fn()),
      invalidate: vi.fn(async () => undefined),
    };
    const service = new GuildConfigService(store as never, cache as never, logger() as never);
    const notify = vi.fn();
    service.setModuleConfigChangeNotifier(notify);

    await service.setModuleConfig('g-1', 'hello-world', { greeting: 'namaste' });

    expect(notify).toHaveBeenCalledWith('hello-world', 'g-1', { greeting: 'namaste' });
  });

  test('with no notifier attached, a config write still succeeds', async () => {
    const store = {
      findByGuildId: vi.fn(async () => undefined),
      upsert: vi.fn(async () => undefined),
    };
    const cache = {
      get: vi.fn(async (_k: string, fn: () => Promise<unknown>) => fn()),
      invalidate: vi.fn(async () => undefined),
    };
    const service = new GuildConfigService(store as never, cache as never, logger() as never);
    await expect(
      service.setModuleConfig('g-1', 'hello-world', { greeting: 'namaste' }),
    ).resolves.toBeUndefined();
    expect(store.upsert).toHaveBeenCalled();
  });
});
