import {
  definePage,
  type ModulePageContext,
  type ModulePageReadModel,
} from "@workspace/swastik";

/**
 * UR-20261027-106 — the dashboard module owns its page.
 *
 * This is the composition that used to live in `apps/main/src/rendering/page-data.ts` (`dashboard()`),
 * a core-base file serving seven modules. It is here now because the doctrine says a module is a
 * self-contained vertical slice owning commands, events, services, data and config — and a page is the
 * module's surface.
 *
 * What it does NOT own is the query. Every fact comes through `ModulePageReadModel` (operator decision,
 * 2026-10-27): the module owns the composition, the framework owns how a fact is read. No handle, no
 * connection, no table name, and no way to name a guild other than the one the page is rendered for.
 *
 * Page 0 is the main dashboard — every core-tier module's commands, combined. Pages 1..n are each
 * standard-tier module's own page, in the order that module was INSTALLED in this guild, so a module
 * keeps its place as others come and go (item 6).
 */
function titleCaseId(slug: string): string {
  return slug
    .split("-")
    .map((part) =>
      part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1),
    )
    .join(" ");
}

export interface DashboardPageData {
  lines: string[];
  pageTotal: number;
  page: number;
  navigation: {
    id: string;
    name: string;
    description: string;
    page: number;
    iconName?: string;
    accent?: string;
  }[];
  pageModuleId?: string;
  pageModuleName?: string;
}

/** The last possible rank: a module with no install row sorts after every module that has one. */
const LAST = Number.MAX_SAFE_INTEGER;

export const dashboardPage = definePage({
  id: "dashboard",

  async render(
    context: ModulePageContext,
    read: ModulePageReadModel,
  ): Promise<DashboardPageData> {
    const all = await read.list();

    // UR-20261011-011 — a disabled standard module has NO page on the dashboard, because its commands
    // are not registered for the guild either (§17.6). UR-20261012-061 — and only the standard modules
    // THIS profile holds.
    const standardEntries = all.filter((module) => module.tier === "standard");
    const considered = await Promise.all(
      standardEntries.map(async (module) => ({
        module,
        mine: await read.ownedByCaller(module.slug),
        enabled: await read.installState(module.slug),
        installedAt: await read.installedAt(module.slug),
      })),
    );

    const standard = considered
      .filter((entry) => entry.mine && entry.enabled)
      .sort((a, b) => (a.installedAt ?? LAST) - (b.installedAt ?? LAST))
      .map((entry) => entry.module);

    const pageTotal = 1 + standard.length;

    const navigation = standard.map((module, index) => ({
      id: module.slug,
      name: module.displayName ?? titleCaseId(module.slug),
      description: module.description,
      page: index + 1,
      ...(module.iconName !== undefined ? { iconName: module.iconName } : {}),
      // The module's OWN accent when it declares one; the frame falls back to the acting profile's.
      ...(module.accent !== undefined ? { accent: module.accent } : {}),
    }));

    // A standard module's own page: that module's commands, under their CURRENT (BCCM-effective) name
    // and status. The marker is the framework's squared module grid, not the module-logo fallback —
    // the list reads as "this module's commands" (UR-20261011-009).
    if (context.page >= 1 && context.page <= standard.length) {
      const entry = standard[context.page - 1];
      if (entry !== undefined) {
        const names = await read.commandNames();
        const marker = await read.markerIcon();
        const lines: string[] = [];
        for (const command of entry.commands) {
          const current = names.get(command.name) ?? command.name;
          const status = await read.commandStatus(command.name);
          lines.push(
            `${marker} \`/${current}\`${status === "disabled" ? "  · disabled" : ""}`,
          );
        }
        // item 7 — the page names its owning module, so the frame carries THAT module's banner, footer
        // and identity rather than the dashboard's.
        return {
          lines,
          pageTotal,
          page: context.page,
          navigation,
          pageModuleId: entry.slug,
          pageModuleName: entry.displayName ?? titleCaseId(entry.slug),
        };
      }
    }

    // Page 0, and the out-of-range fallback: every core-tier module's commands, each with its icon.
    const lines: string[] = [];
    for (const module of all) {
      if (module.tier !== "core") continue;
      const icon = await read.moduleIcon(module.iconName);
      for (const command of module.commands)
        lines.push(`${icon} \`/${command.name}\``);
    }
    return { lines, pageTotal, page: 0, navigation };
  },
});
