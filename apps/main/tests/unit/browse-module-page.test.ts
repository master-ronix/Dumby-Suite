import { describe, test, expect } from 'vitest';
import { browsePage } from '@module-browse-page';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the browse module's OWN page: the catalogue. Three questions it must never
 * conflate, each answered by its own capability — the guild's stored row (`undefined` is not `false`),
 * the per-profile default, and who holds it (`undefined` is nobody, not the main bot).
 */
const modules: readonly ModuleSummary[] = [
  { slug: 'health', tier: 'core', description: 'h', commands: [] },
  {
    slug: 'hello-world',
    tier: 'standard',
    description: 'hello description',
    displayName: 'Hello World',
    iconName: 'dumby_hello',
    commands: [],
  },
  {
    slug: 'shop',
    tier: 'marketplace',
    description: 'shop description',
    devId: 'acme',
    commands: [],
  },
];

interface State {
  guildRow?: boolean;
  mine?: boolean;
  holder?: string;
  perProfileDefault?: boolean;
  tierDefault?: boolean;
}

function readModel(states: Record<string, State> = {}): ModulePageReadModel {
  const state = (slug: string): State => states[slug] ?? {};
  return {
    list: async () => modules,
    installState: async () => true,
    installedAt: async () => undefined,
    // Default: nobody holds it, so the catalogue offers it — the fixture must not make every
    // module look already-held, which is what hid three failures behind one wrong default.
    ownedByCaller: async (slug) => state(slug).mine ?? false,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async (iconName) => (iconName === undefined ? 'FALLBACK' : `[${iconName}]`),
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: async () => ({ profileId: 'main', gatewayReady: true, loadedModules: [] }),
    heldModules: async () => [],
    shardCount: async () => 1,
    guilds: async () => ({ total: 0, source: 'cache' }),
    hostProcess: () => ({
      uptimeSeconds: 0,
      nodeVersion: 'v20.20.2',
      memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
    }),
    pendingQueue: async () => [],
    holder: async (slug) => state(slug).holder,
    guildState: async (slug) => state(slug).guildRow,
    tierDefault: async (slug) => state(slug).tierDefault ?? slug !== 'shop',
    enabledByDefault: async (slug) => state(slug).perProfileDefault ?? slug !== 'shop',
    profileLabel: async (profileId) => (profileId === 'main' ? 'Dumby Profile' : 'Magma'),
  };
}

const ctx = { guildId: 'g1', applicationId: 'app-1', profileId: 'main', page: 0 };

describe('browse module page — the composition that moved out of page-data.ts', () => {
  test('core modules are never listed', async () => {
    const data = await browsePage.render(ctx, readModel());
    expect(data.modules.map((module) => module.id)).not.toContain('health');
    expect(data.lines).toHaveLength(2);
  });

  test('an enabled module this profile holds is not offered', async () => {
    const data = await browsePage.render(
      ctx,
      readModel({ 'hello-world': { guildRow: true, mine: true } }),
    );
    expect(data.modules.map((module) => module.id)).toEqual(['shop']);
  });

  test('a disabled standard module is marked previously installed, not occupied', async () => {
    const data = await browsePage.render(
      ctx,
      readModel({ 'hello-world': { guildRow: false, mine: true } }),
    );
    const hello = data.modules.find((module) => module.id === 'hello-world');
    expect(hello?.previouslyInstalled).toBe(true);
    expect(hello?.occupied).toBeUndefined();
  });

  test('a module another profile holds is occupied, and named', async () => {
    const data = await browsePage.render(
      ctx,
      readModel({ 'hello-world': { guildRow: true, mine: false, holder: 'p-1' } }),
    );
    const hello = data.modules.find((module) => module.id === 'hello-world');
    expect(hello?.occupied).toBe(true);
    expect(hello?.occupiedBy).toBe('Magma');
  });

  test('a module nobody holds is NOT reported as occupied', async () => {
    const data = await browsePage.render(
      ctx,
      readModel({ 'hello-world': { guildRow: true, mine: false } }),
    );
    const hello = data.modules.find((module) => module.id === 'hello-world');
    expect(hello?.occupied).toBeUndefined();
  });

  test('the search matches the id, display name, developer and description', async () => {
    const byId = await browsePage.render({ ...ctx, query: 'hello' }, readModel());
    expect(byId.modules.map((module) => module.id)).toEqual(['hello-world']);
    const byDev = await browsePage.render({ ...ctx, query: 'acme' }, readModel());
    expect(byDev.modules.map((module) => module.id)).toEqual(['shop']);
    const none = await browsePage.render({ ...ctx, query: 'zzz' }, readModel());
    expect(none.lines).toEqual(['No modules match "zzz".']);
  });

  test('an empty catalogue says so', async () => {
    const data = await browsePage.render(
      ctx,
      readModel({
        'hello-world': { guildRow: true, mine: true },
        shop: { guildRow: true, mine: true },
      }),
    );
    expect(data.lines).toEqual(['No marketplace modules are available to install.']);
  });

  test('the module keeps its own icon and the option carries the icon name', async () => {
    const data = await browsePage.render(ctx, readModel());
    const hello = data.modules.find((module) => module.id === 'hello-world');
    expect(hello?.icon).toBe('[dumby_hello]');
    expect(hello?.iconName).toBe('dumby_hello');
    expect(hello?.name).toBe('Hello World');
  });
});
