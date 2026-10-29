import { describe, test, expect } from 'vitest';
import { healthPage } from '@module-health-page';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the health module's OWN page, tested where the code now lives.
 *
 * The alias in vitest.config.ts points at the module's `.ts` file, so this exercises the composition
 * that moved out of `page-data.ts` without `apps/main` gaining a dependency on the module package.
 * What the page owns is the PAGE: which subsystems appear, how the overall state is derived from the
 * worst of them, and how each number is labelled. Every fact arrives through the read-model.
 */
const modules: readonly ModuleSummary[] = [
  { slug: 'health', tier: 'core', description: 'h', commands: [] },
  { slug: 'dashboard', tier: 'core', description: 'd', commands: [] },
  { slug: 'permit', tier: 'admin', description: 'p', commands: [] },
  { slug: 'hello-world', tier: 'standard', description: 's', commands: [] },
];

function readModel(over: Partial<ModulePageReadModel> = {}): ModulePageReadModel {
  return {
    list: async () => modules,
    installState: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async () => true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async () => 'ICON',
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: async () => ({
      profileId: 'main',
      gatewayReady: true,
      gatewayPingMs: 42,
      loadedModules: [],
    }),
    heldModules: async () => [],
    shardCount: async () => 1,
    guilds: async () => ({ total: 2, members: 7, source: 'live' }),
    hostProcess: () => ({
      uptimeSeconds: 90_061,
      nodeVersion: 'v20.20.2',
      memory: { rss: 104_857_600, heapUsed: 52_428_800, heapTotal: 78_643_200 },
    }),
    ...over,
  };
}

const ctx = { guildId: 'g1', applicationId: 'app-1', profileId: 'main', page: 0 };

const group = (data: { groups: { name: string }[] }, name: string) =>
  data.groups.find((entry) => entry.name === name);

describe('health module page — the composition that moved out of page-data.ts', () => {
  test('every subsystem group is present and operational when nothing is down', async () => {
    const data = await renderData(ctx, readModel());
    expect(data.groups.map((entry) => entry.name)).toEqual([
      'Discord API',
      'Host Process (shared)',
      'Modules',
      'Database',
      'Cache',
      'Guilds & Users',
    ]);
    expect(data.status).toBe('operational');
    expect(data.statusLabel).toBe('Operational');
    expect(data.summary).toBe('Operational');
  });

  test('the host metrics are labelled SHARED, and formatted', async () => {
    const data = await renderData(ctx, readModel());
    const host = group(data, 'Host Process (shared)');
    expect(host?.rows).toEqual([
      ['Host Uptime', '1d 1h 1m'],
      ['Node.js Version', 'v20.20.2'],
      ['Memory Usage', '100.0 MB'],
      ['Heap Used', '50.0 MB'],
      ['Heap Total', '75.0 MB'],
    ]);
  });

  test('a critical subsystem down makes the page Down, not Degraded', async () => {
    const data = await renderData(
      ctx,
      readModel({ probe: async () => ({ database: 'unavailable', redis: 'connected' }) }),
    );
    expect(data.status).toBe('down');
    expect(group(data, 'Database')?.status).toBe('down');
  });

  test('a non-critical subsystem down degrades the page', async () => {
    const data = await renderData(
      ctx,
      readModel({ probe: async () => ({ database: 'connected', redis: 'unavailable' }) }),
    );
    expect(data.status).toBe('degraded');
    expect(data.statusLabel).toBe('Degraded');
  });

  test('a disconnected gateway is down, and the shard count still reports', async () => {
    const data = await renderData(
      ctx,
      readModel({
        actingProfile: async () => ({
          profileId: 'main',
          gatewayReady: false,
          loadedModules: [],
        }),
        shardCount: async () => 4,
      }),
    );
    const discord = group(data, 'Discord API');
    expect(discord?.status).toBe('down');
    // No ping row when the client reports none; the shard count is a separate fact.
    expect(discord?.rows).toEqual([
      ['Gateway Status', 'Disconnected'],
      ['Shard Count', '4'],
    ]);
    expect(data.status).toBe('down');
  });

  test('the module count is core + admin + what the profile HOLDS', async () => {
    const data = await renderData(ctx, readModel({ heldModules: async () => ['hello-world'] }));
    const counts = group(data, 'Modules');
    expect(counts?.rows).toEqual([
      ['Total Loaded', '4'],
      ['Core-tier', '2'],
      ['Standard-tier', '1'],
      ['Marketplace-tier', '0'],
      ['Admin-tier', '1'],
    ]);
  });

  test('an unheld standard module is not counted', async () => {
    const data = await renderData(ctx, readModel({ heldModules: async () => [] }));
    expect(group(data, 'Modules')?.rows?.[0]).toEqual(['Total Loaded', '3']);
  });

  test('the guild group says which source answered, and never prints a zero for an empty cache', async () => {
    const live = await renderData(ctx, readModel());
    expect(group(live, 'Guilds & Users')?.rows).toEqual([
      ['Total Guilds', '2'],
      ['Total Users', '7'],
      ['Source', 'Discord API'],
    ]);

    const cached = await renderData(
      ctx,
      readModel({ guilds: async () => ({ total: 2, source: 'cache' }) }),
    );
    expect(group(cached, 'Guilds & Users')?.rows).toEqual([
      ['Total Guilds', '2'],
      ['Total Users', 'not yet cached'],
      ['Source', 'Cached snapshot'],
    ]);
  });

  test('a profile runtime row appears only when her runtime has started', async () => {
    expect(group(await renderData(ctx, readModel()), 'Profile Runtime')).toBeUndefined();
    const started = await renderData(
      ctx,
      readModel({
        actingProfile: async () => ({
          profileId: 'p-1',
          startedAt: Date.now() - 120_000,
          gatewayReady: true,
          loadedModules: [],
        }),
      }),
    );
    expect(group(started, 'Profile Runtime')?.rows).toEqual([['Uptime', '0d 0h 2m']]);
  });
});
