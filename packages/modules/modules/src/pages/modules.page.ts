import {
  definePage,
  modulePageNavigation,
  type ModulePageContext,
  type ModulePageReadModel,
} from '@workspace/swastik';
import { modulesBlocks } from '../blocks/modules.blocks.js';

/**
 * UR-20261027-106 — the modules module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`installedModules()`).
 * What it owns: which modules a member sees on this surface, how they are paged, and what the dial
 * says.
 *
 * The rule it states in one place (UR-20261012-061): this surface shows what THIS PROFILE holds, not
 * what the guild has. Core is shared and always listed; a standard or marketplace module appears only
 * for the profile that claimed it, and only while it is enabled. Installing a module in the main bot
 * no longer makes it appear for a persona, or the reverse.
 */
export interface ModulesPageEntry {
  id: string;
  name: string;
  tier: string;
  description: string;
  icon: string;
}

export interface ModulesPageData {
  title: string;
  lines: string[];
  modules: ModulesPageEntry[];
  page: number;
  pageTotal: number;
  total: number;
  navigation: readonly { id: string; name: string; description: string; page: number }[];
}

/** Six per slide — the ceiling a member can read at a glance without scrolling the embed. */
const MODULES_PAGE_SIZE = 6;

/** The display name for a module id: `hello-world` becomes `Hello World`. */
function titleCaseId(id: string): string {
  return id
    .split(/[-_]/)
    .map((part) => (part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1)))
    .join(' ');
}

export const modulesPage = definePage({
  id: 'modules',

  async render(context: ModulePageContext, read: ModulePageReadModel): Promise<ModulesPageData> {
    const all = await read.list();

    // Resolved before filtering: the predicate needs ownership and the guild's own state, and a
    // filter callback cannot await.
    const rows = await Promise.all(
      all.map(async (module) => ({
        module,
        mine: await read.ownedByCaller(module.slug),
        guildRow: await read.guildState(module.slug),
        tierDefault: await read.tierDefault(module.slug),
      })),
    );

    const enabled = rows
      .filter((row) => {
        const tier = row.module.tier;
        // Admin modules are never listed on this surface.
        if (tier === 'admin') return false;
        if (row.mine !== true) return false;
        // Core is shared and always listed.
        if (tier === 'core') return true;
        return row.guildRow ?? row.tierDefault;
      })
      .map((row) => row.module);

    const total = enabled.length;
    const pageTotal = Math.max(1, Math.ceil(total / MODULES_PAGE_SIZE));
    const current = Math.min(Math.max(context.page, 0), pageTotal - 1);
    const slice = enabled.slice(current * MODULES_PAGE_SIZE, (current + 1) * MODULES_PAGE_SIZE);

    const modules = await Promise.all(
      slice.map(async (module): Promise<ModulesPageEntry> => ({
        id: module.slug,
        name: module.displayName ?? titleCaseId(module.slug),
        tier: module.tier,
        description: module.description,
        icon: await read.moduleIcon(module.iconName),
      })),
    );

    const data = {
      title: 'Installed Modules',
      lines: modules.map(
        (module) => `${module.icon} ${module.name} (${module.tier}) — ${module.description}`,
      ),
      modules,
      page: current,
      pageTotal,
      total,
      // item 6 / item 17 — the DIAL's entries are the PAGES, not the modules: this surface pages the
      // modules directly, so an option per module would offer targets that do not exist.
      navigation: modulePageNavigation(pageTotal, total, MODULES_PAGE_SIZE),
    };

    // UR-20261029-115 — the module composes its own content blocks; the framework keeps the dial.
    return {
      data,
      blocks: modulesBlocks(
        data as unknown as Readonly<Record<string, unknown>>,
        context.profileId,
      ),
    };
  },
});
