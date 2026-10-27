import { describe, test, expect, vi } from 'vitest';
import { makePageReadModel } from '../../src/rendering/page-read-model.js';
import type { PageReadModelSources } from '../../src/rendering/page-read-model.js';

/**
 * UR-20261027-106 — the read-model a module's page calls.
 *
 * The point of this adapter is that a module asks for a FACT and never for a handle: no table name,
 * no connection, no guild it can choose. These cases pin that shape, and pin that the module summary
 * carries manifest facts verbatim rather than the host's internals.
 */
function sources(over: Partial<PageReadModelSources> = {}): PageReadModelSources {
  return {
    listModules: () => [
      {
        name: 'hello-world',
        tier: 'standard',
        description: 'A simple hello world module.',
        ui: { displayName: 'Hello', icon: 'dumby_hello', accent: 'amber' },
        commands: [{ name: 'hello', description: 'Say hello' }],
      },
      { name: 'health', tier: 'core', description: 'Health.', commands: [] },
    ],
    isEnabled: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async () => true,
    commandNames: async () => new Map([['hello', 'hello-renamed']]),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'dumby_modules',
    moduleIcon: (iconName) => (iconName === undefined ? 'dumby_module' : `<:${iconName}:1>`),
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: () => ({
      profileId: 'main',
      gatewayReady: true,
      gatewayPingMs: 42,
      loadedModules: [],
    }),
    heldModules: async () => [],
    shardCount: () => 2,
    ...over,
  };
}

describe('PageReadModel — a module asks for facts, never for a handle', () => {
  test('list() reports manifest facts and nothing else', async () => {
    const read = makePageReadModel(sources());
    const modules = await read.list();
    expect(modules[0]).toEqual({
      slug: 'hello-world',
      tier: 'standard',
      description: 'A simple hello world module.',
      displayName: 'Hello',
      iconName: 'dumby_hello',
      accent: 'amber',
      commands: [{ name: 'hello', description: 'Say hello' }],
    });
    // A module with no ui block carries no displayName/iconName/accent keys at all.
    expect(modules[1]).not.toHaveProperty('displayName');
    expect(modules[1]).not.toHaveProperty('accent');
  });

  test('every method delegates to its source and takes no guild argument', async () => {
    const isEnabled = vi.fn(async () => false);
    const installedAt = vi.fn(async () => 1_700_000_000_000);
    const ownedByCaller = vi.fn(async () => false);
    const commandStatus = vi.fn(async () => 'disabled' as const);
    const read = makePageReadModel(
      sources({ isEnabled, installedAt, ownedByCaller, commandStatus }),
    );

    expect(await read.installState('hello-world')).toBe(false);
    expect(await read.installedAt('hello-world')).toBe(1_700_000_000_000);
    expect(await read.ownedByCaller('hello-world')).toBe(false);
    expect(await read.commandStatus('hello')).toBe('disabled');
    expect(isEnabled).toHaveBeenCalledWith('hello-world');
    expect(installedAt).toHaveBeenCalledWith('hello-world');
    expect(ownedByCaller).toHaveBeenCalledWith('hello-world');
    expect(commandStatus).toHaveBeenCalledWith('hello');
  });

  test('the command-name map is passed through as the guild resolves it', async () => {
    const read = makePageReadModel(sources());
    expect([...(await read.commandNames())]).toEqual([['hello', 'hello-renamed']]);
    expect(await read.markerIcon()).toBe('dumby_modules');
    // A declared icon resolves to the application's own emoji reference; an absent one falls back.
    expect(await read.moduleIcon('dumby_health')).toBe('<:dumby_health:1>');
    expect(await read.moduleIcon(undefined)).toBe('dumby_module');
    // The framework answers reachability; the module never holds a connection.
    expect(await read.probe()).toEqual({ database: 'connected', redis: 'connected' });
    expect((await read.actingProfile()).gatewayPingMs).toBe(42);
    expect(await read.heldModules()).toEqual([]);
    // A narrow config read: the shard count and nothing else from the configuration surface.
    expect(await read.shardCount()).toBe(2);
  });

  test('an absent install row stays absent rather than becoming a zero timestamp', async () => {
    const read = makePageReadModel(sources({ installedAt: async () => undefined }));
    expect(await read.installedAt('never-installed')).toBeUndefined();
  });
});
