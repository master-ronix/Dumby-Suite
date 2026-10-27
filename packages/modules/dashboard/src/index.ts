import { dashboardCommand } from "./commands/dashboard.command.js";

export const MODULE_SLUG = "dashboard";

export const MODULE_DESCRIPTION =
  "Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.";

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [dashboardCommand];

export type ModuleState = "loading" | "ready";

let loads = 0;
let state: ModuleState = "loading";

export function loadCount(): number {
  return loads;
}

export function currentState(): ModuleState {
  return state;
}

export async function onLoad(): Promise<void> {
  loads += 1;
}

export async function onReady(): Promise<void> {
  state = "ready";
}

export async function onUnload(): Promise<void> {
  state = "loading";
}

// UR-20261027-106 — the module OWNS its page. The loader registers it; the host consults the registry
// before its own switch, so this composition is what renders /dashboard.
import { dashboardPage } from "./pages/dashboard.page.js";

export {
  dashboardPage,
  type DashboardPageData,
} from "./pages/dashboard.page.js";

/**
 * The surface the LOADER reads. It registers `pages`, not the individual export names — declaring the
 * page and never exporting it here left the registry empty and `/dashboard` rendering nothing, which
 * is the one failure this shape makes possible.
 */
export const pages = [dashboardPage];
