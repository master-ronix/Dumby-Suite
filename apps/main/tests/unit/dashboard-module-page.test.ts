import { describe, test, expect } from 'vitest';
import { dashboardPage } from '../../../packages/modules/dashboard/src/pages/dashboard.page.js';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the dashboard module's OWN page, tested where the code now lives.
 *
 * This file reaches the module by relative path on purpose: `apps/main` does not depend on module
 * packages (they are loaded from volumes at runtime), and adding one as a dependency would be a
 * lockfile change. The ideal is a vitest harness inside the package; until then this is the honest
 * way to keep the moved composition covered, and it is the reference the other six slices copy.
 *
 * Every fact the page uses arrives through the read-model, so the read-model is the whole seam: these
 * cases pin what the page asks for, in what order it sorts, and what it renders.
 */
interface ModuleFixture {
  slug: string;
  tier: string;
  commands: { name: string; description: string }[];
  displayName?: string;
  iconName?: string;
  accent?: string;
  owned?: boolean;
  enabled?: boolean;
  installedAt?: number;
}

function readModel(
  fixtures: ModuleFixture[],
  over: Partial<ModulePageReadModel> = {},
): ModulePageReadModel {
  const byslug = new Map(fixtures.map((fixture) => [fixture.slug, fixture]));
  return {
    list: async (): Promise<readonly ModuleSummary[]> =>
      fixtures.map((fixture) => ({
        slug: fixture.slug,
        tier: fixture.tier,
        description: `${fixture.slug} description`,
        ...(fixture.displayName !== undefined ? { displayName: fixture.displayName } : {}),
        ...(fixture.iconName !== undefined ? { iconName: fixture.iconName } : {}),
        ...(fixture.accent !== undefined ? { accent: fixture.accent } : {}),
        commands: fixture.commands,
      })),
    installState: async (slug) => byslug.get(slug)?.enabled ?? true,
    installedAt: async (slug) => byslug.get(slug)?.installedAt,
    ownedByCaller: async (slug) => byslug.get(slug)?.owned ?? true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async (iconName) => (iconName === undefined ? 'FALLBACK' : `[${iconName}]`),
    ...over,
  };
}

const ctx = (page: number) => ({ guildId: 'g1', applicationId: 'app-1', profileId: 'main', page });

const coreAndStandard: ModuleFixture[] = [
  {
    slug: 'health',
    tier: 'core',
    commands: [{ name: 'health', description: 'h' }],
    iconName: 'dumby_health',
  },
  { slug: 'dashboard', tier: 'core', commands: [{ name: 'dashboard', description: 'd' }] },
  {
    slug: 'hello-world',
    tier: 'standard',
    commands: [{ name: 'hello', description: 's' }],
    displayName: 'Hello World',
    installedAt: 1_000,
  },
  {
    slug: 'browse',
    tier: 'standard',
    commands: [{ name: 'browse', description: 'b' }],
    installedAt: 2_000,
  },
];

describe('dashboard module page — the composition that used to live in page-data.ts', () => {
  test('page 0 lists every core module command with its own icon', async () => {
    const data = await dashboardPage.render(ctx(0), readModel(coreAndStandard));
    // A core module's declared icon resolves through the read-model; one without falls back.
    expect(data.lines).toEqual(['[dumby_health] `/health`', 'FALLBACK `/dashboard`']);
    expect(data.page).toBe(0);
  });

  test('standard module pages are ordered by when the module was installed', async () => {
    const data = await dashboardPage.render(ctx(0), readModel(coreAndStandard));
    // hello-world was installed first, so it is page 1 — a module keeps its place as others arrive.
    expect(data.navigation.map((entry) => entry.id)).toEqual(['hello-world', 'browse']);
    expect(data.pageTotal).toBe(3);
  });

  test('a module page carries the module identity, its marker and its commands', async () => {
    const data = await dashboardPage.render(ctx(1), readModel(coreAndStandard));
    expect(data.lines).toEqual(['MARKER `/hello`']);
    expect(data.pageModuleId).toBe('hello-world');
    expect(data.pageModuleName).toBe('Hello World');
  });

  test('a disabled or unheld standard module has no page at all', async () => {
    const fixtures = coreAndStandard.map((fixture) =>
      fixture.slug === 'hello-world' ? { ...fixture, enabled: false } : fixture,
    );
    const data = await dashboardPage.render(ctx(1), readModel(fixtures));
    // browse is now page 1, and hello-world appears nowhere.
    expect(data.pageModuleId).toBe('browse');
    expect(data.navigation.map((entry) => entry.id)).toEqual(['browse']);

    const unheld = coreAndStandard.map((fixture) =>
      fixture.slug === 'browse' ? { ...fixture, owned: false } : fixture,
    );
    const second = await dashboardPage.render(ctx(0), readModel(unheld));
    expect(second.navigation.map((entry) => entry.id)).toEqual(['hello-world']);
  });

  test('a BCCM-effective name and a disabled status reach the line', async () => {
    const read = readModel(coreAndStandard, {
      commandNames: async () => new Map([['hello', 'hello-renamed']]),
      commandStatus: async () => 'disabled',
    });
    const data = await dashboardPage.render(ctx(1), read);
    expect(data.lines).toEqual(['MARKER `/hello-renamed`  · disabled']);
  });

  test('an out-of-range page falls back to page 0', async () => {
    const data = await dashboardPage.render(ctx(99), readModel(coreAndStandard));
    expect(data.page).toBe(0);
    expect(data.lines).toEqual(['[dumby_health] `/health`', 'FALLBACK `/dashboard`']);
  });

  test('a module’s own icon and accent travel into the navigation', async () => {
    const fixtures = coreAndStandard.map((fixture) =>
      fixture.slug === 'hello-world'
        ? { ...fixture, iconName: 'dumby_hello', accent: 'amber' }
        : fixture,
    );
    const data = await dashboardPage.render(ctx(0), readModel(fixtures));
    expect(data.navigation[0]).toEqual({
      id: 'hello-world',
      name: 'Hello World',
      description: 'hello-world description',
      page: 1,
      iconName: 'dumby_hello',
      accent: 'amber',
    });
  });
});
