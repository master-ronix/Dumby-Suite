import { describe, test, expect } from 'vitest';
import { modulesPage } from '@module-modules-page';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the modules module's OWN page: what THIS PROFILE holds, paged, with the dial
 * naming slides rather than modules.
 */
const modules: readonly ModuleSummary[] = [
  { slug: 'health', tier: 'core', description: 'h', commands: [] },
  { slug: 'dashboard', tier: 'core', description: 'd', commands: [] },
  { slug: 'permit', tier: 'admin', description: 'p', commands: [] },
  {
    slug: 'hello-world',
    tier: 'standard',
    description: 's',
    displayName: 'Hello World',
    commands: [],
  },
  { slug: 'shop', tier: 'marketplace', description: 'm', commands: [] },
];

interface State {
  mine?: boolean;
  guildRow?: boolean;
  tierDefault?: boolean;
}

function readModel(states: Record<string, State> = {}): ModulePageReadModel {
  const state = (slug: string): State => states[slug] ?? {};
  return {
    list: async () => modules,
    installState: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async (slug) => state(slug).mine ?? true,
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
    holder: async () => undefined,
    guildState: async (slug) => state(slug).guildRow,
    tierDefault: async (slug) => state(slug).tierDefault ?? slug !== 'shop',
    enabledByDefault: async (slug) => state(slug).mine ?? true,
    profileLabel: async () => 'Dumby Profile',
  };
}

const ctx = (page = 0) => ({ guildId: 'g1', applicationId: 'app-1', profileId: 'main', page });

describe('modules module page — the composition that moved out of page-data.ts', () => {
  test('core is always listed, admin never is', async () => {
    const data = await modulesPage.render(ctx(), readModel());
    expect(data.modules.map((module) => module.id)).toEqual([
      'health',
      'dashboard',
      'hello-world',
      'shop',
    ]);
    expect(data.total).toBe(4);
  });

  test('a module this profile does not hold is absent', async () => {
    const data = await modulesPage.render(ctx(), readModel({ 'hello-world': { mine: false } }));
    expect(data.modules.map((module) => module.id)).not.toContain('hello-world');
  });

  test('a standard module the guild disabled is absent, a core one is not', async () => {
    const data = await modulesPage.render(
      ctx(),
      readModel({ 'hello-world': { guildRow: false }, health: { guildRow: false } }),
    );
    expect(data.modules.map((module) => module.id)).toEqual(['health', 'dashboard', 'shop']);
  });

  test('the display name is the declared one, else the title-cased id', async () => {
    const data = await modulesPage.render(ctx(), readModel());
    const names = data.modules.map((module) => module.name);
    expect(names).toContain('Hello World');
    expect(names).toContain('Health');
  });

  test('the line carries the icon, the name, the tier and the description', async () => {
    const data = await modulesPage.render(ctx(), readModel());
    expect(data.lines[0]).toBe('FALLBACK Health (core) — h');
  });

  test('more than six modules pages, and the dial names slides not modules', async () => {
    const many: readonly ModuleSummary[] = Array.from({ length: 8 }, (_, index) => ({
      slug: `mod-${index + 1}`,
      tier: 'core',
      description: `d${index + 1}`,
      commands: [],
    }));
    const read = { ...readModel(), list: async () => many };
    const first = await modulesPage.render(ctx(0), read);
    expect(first.total).toBe(8);
    expect(first.pageTotal).toBe(2);
    expect(first.modules).toHaveLength(6);
    // Page 0 is Home; the slides are 1..pageTotal-1, so there is exactly one slide here.
    expect(first.navigation).toEqual([
      { id: 'page-2', name: 'Slide I', description: 'Modules 7–8', page: 1 },
    ]);
    const second = await modulesPage.render(ctx(1), read);
    expect(second.modules.map((module) => module.id)).toEqual(['mod-7', 'mod-8']);
    expect(second.page).toBe(1);
  });

  test('a page past the end clamps to the last slide', async () => {
    const data = await modulesPage.render(ctx(99), readModel());
    expect(data.page).toBe(0);
    expect(data.pageTotal).toBe(1);
    expect(data.navigation).toEqual([]);
  });
});
