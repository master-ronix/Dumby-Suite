import { definePage, type ModulePageContext, type ModulePageReadModel } from '@workspace/swastik';

/**
 * UR-20261027-106 — the browse module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`marketplace()`). It is the
 * catalogue: what this guild can install or re-enable, filtered by what this profile may take.
 *
 * Three questions the page must never conflate, each answered by its own capability:
 *   * `guildState` — the guild's stored row, `undefined` when it has none. `undefined` is NOT `false`:
 *     "never touched here" and "the guild disabled it" lead to different labels.
 *   * `enabledByDefault` — whether THIS profile gets it by default, which depends on ownership.
 *   * `holder` — who holds it, `undefined` meaning nobody. The host page once used `undefined` as a
 *     proxy for the main bot, which is how a module nobody held was labelled as occupied.
 */
export interface BrowseModule {
  id: string;
  name: string;
  tier: string;
  description: string;
  icon: string;
  iconName?: string;
  occupied?: boolean;
  occupiedBy?: string;
  previouslyInstalled?: boolean;
}

export interface BrowsePageData {
  lines: string[];
  modules: BrowseModule[];
  query: string;
  total: number;
}

/** The main view is a SHORT list of what is available — the rest is what Discover is for. */
const BROWSE_MAIN_LIMIT = 15;
/** One dropdown slot is reserved for the permanent Home entry, so the listing and the install
 *  dropdown stay in sync within Discord's 25-option ceiling (UR-20261011-006). */
const MARKETPLACE_MODULE_CAP = 24;

export const browsePage = definePage({
  id: 'browse',

  async render(context: ModulePageContext, read: ModulePageReadModel): Promise<BrowsePageData> {
    const query = context.query;
    const all = await read.list();

    // Core and Admin are never listed: they are shared, not installable.
    const candidates = all.filter(
      (module) => module.tier === 'marketplace' || module.tier === 'standard',
    );

    // Resolved BEFORE filtering, because the predicate needs the ownership-aware default and a
    // filter callback cannot await.
    const rows = await Promise.all(
      candidates.map(async (module) => ({
        module,
        guildRow: await read.guildState(module.slug),
        perProfileDefault: await read.enabledByDefault(module.slug),
        mine: await read.ownedByCaller(module.slug),
      })),
    );

    const available = rows
      .filter((row) => {
        const enabled = row.guildRow ?? row.perProfileDefault;
        // Not enabled: installable, or re-enableable. Enabled: offer it only when this profile does
        // NOT hold it — i.e. when another profile has it, so the operator is told rather than shown a
        // control that would refuse.
        if (!enabled) return true;
        return row.mine !== true;
      })
      .map((row) => row.module);

    // item 5b — the search matches what a member can actually type: the module's id, its display
    // name, its developer and its description.
    const q = (query ?? '').trim().toLowerCase();
    const matched =
      q === ''
        ? available
        : available.filter((module) =>
            [module.slug, module.displayName ?? '', module.devId ?? '', module.description]
              .join(' ')
              .toLowerCase()
              .includes(q),
          );

    const shown = matched.slice(0, q === '' ? BROWSE_MAIN_LIMIT : MARKETPLACE_MODULE_CAP);

    const modules = await Promise.all(
      shown.map(async (module): Promise<BrowseModule> => {
        const guildRow = await read.guildState(module.slug);
        const guildEnabled = guildRow ?? (await read.tierDefault(module.slug));
        const mine = await read.ownedByCaller(module.slug);
        const holder = await read.holder(module.slug);
        // Occupied means: held by ANOTHER profile AND live for the guild. `!mine` alone would be true
        // for "nobody holds it" too, which is why `holder !== undefined` is part of the predicate.
        const occupied = !mine && holder !== undefined && guildEnabled;
        const icon = await read.moduleIcon(module.iconName);

        return {
          id: module.slug,
          name: module.displayName ?? module.slug,
          tier: module.tier,
          description: module.description,
          icon,
          ...(module.iconName !== undefined ? { iconName: module.iconName } : {}),
          ...(occupied && holder !== undefined
            ? { occupied: true, occupiedBy: await read.profileLabel(holder) }
            : {}),
          // A disabled STANDARD module is "Previously Installed": selecting it re-enables it. Carried
          // as a STATE, not as subtext — the listing stays clean and the private notice says it.
          ...(!occupied && module.tier === 'standard' && !guildEnabled
            ? { previouslyInstalled: true }
            : {}),
        };
      }),
    );

    const lines: string[] =
      modules.length === 0
        ? [
            q === ''
              ? 'No marketplace modules are available to install.'
              : `No modules match "${query ?? ''}".`,
          ]
        : modules.map((module) => `${module.icon} ${module.name} — ${module.description}`);

    return { lines, modules, query: query ?? '', total: matched.length };
  },
});
