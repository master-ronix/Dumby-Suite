import { describe, test, expect } from 'vitest';
import { dashboardPage } from '@module-dashboard-page';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the dashboard module's OWN page, tested where the code now lives.
 *
 * The alias in vitest.config.ts points straight at the module's `.ts` file, so this suite exercises
 * the composition that moved out of `page-data.ts` without `apps/main` gaining a dependency on the
 * module package. Every fact the page uses arrives through the read-model, so the read-model is the
 * whole seam: these cases pin what it asks for, how it orders, and what it renders.
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
  const bySlug = new Map(fixtures.map((fixture) => [fixture.slug, fixture]));
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
    installState: async (slug) => bySlug.get(slug)?.enabled ?? true,
    installedAt: async (slug) => bySlug.get(slug)?.installedAt,
    ownedByCaller: async (slug) => bySlug.get(slug)?.owned ?? true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async (iconName) => (iconName === undefined ? 'FALLBACK' : `[${iconName}]`),
    ...over,
  };
}

const ctx = (page: number) => ({ guildId: 'g1', applicationId: 'app-1', profileId: 'main', page });

const fixtures: ModuleFixture[] = [
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

describe('dashboard module page — the composition that moved out of page-data.ts', () => {
  test('page 0 lists every core module command with its own icon', async () => {
    const data = await dashboardPage.render(ctx(0), readModel(fixtures));
    expect(data.lines).toEqual(['[dumby_health] `/health`', 'FALLBACK `/dashboard`']);
    expect(data.page).toBe(0);
  });

  test('standard module pages are ordered by when the module was installed', async () => {
    const data = await dashboardPage.render(ctx(0), readModel(fixtures));
    expect(data.navigation.map((entry) => entry.id)).toEqual(['hello-world', 'browse']);
    expect(data.pageTotal).toBe(3);
  });

  test('a module page carries the module identity, its marker and its commands', async () => {
    const data = await dashboardPage.render(ctx(1), readModel(fixtures));
    expect(data.lines).toEqual(['MARKER `/hello`']);
    expect(data.pageModuleId).toBe('hello-world');
    expect(data.pageModuleName).toBe('Hello World');
  });

  test('a disabled module has no page, and an unheld one has none either', async () => {
    const disabled = fixtures.map((f) => (f.slug === 'hello-world' ? { ...f, enabled: false } : f));
    expect((await dashboardPage.render(ctx(1), readModel(disabled))).pageModuleId).toBe('browse');

    const unheld = fixtures.map((f) => (f.slug === 'browse' ? { ...f, owned: false } : f));
    const second = await dashboardPage.render(ctx(0), readModel(unheld));
    expect(second.navigation.map((entry) => entry.id)).toEqual(['hello-world']);
  });

  test('a BCCM-effective name and a disabled status reach the line', async () => {
    const read = readModel(fixtures, {
      commandNames: async () => new Map([['hello', 'hello-renamed']]),
      commandStatus: async () => 'disabled',
    });
    const data = await dashboardPage.render(ctx(1), read);
    expect(data.lines).toEqual(['MARKER `/hello-renamed`  · disabled']);
  });

  test('an out-of-range page falls back to page 0', async () => {
    const data = await dashboardPage.render(ctx(99), readModel(fixtures));
    expect(data.page).toBe(0);
  });

  test('a module’s own icon and accent travel into the navigation', async () => {
    const withArt = fixtures.map((f) =>
      f.slug === 'hello-world' ? { ...f, iconName: 'dumby_hello', accent: 'amber' } : f,
    );
    const data = await dashboardPage.render(ctx(0), readModel(withArt));
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
