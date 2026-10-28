import { modulesCommand } from './commands/modules.command.js';

export const MODULE_SLUG = 'modules';

export const MODULE_DESCRIPTION = 'View activated/installed/standard-tier modules and manage them.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [modulesCommand];

export type ModuleState = 'loading' | 'ready';

let loads = 0;
let state: ModuleState = 'loading';

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
  state = 'ready';
}

export async function onUnload(): Promise<void> {
  state = 'loading';
}

// UR-20261027-106 — the module OWNS its page. The loader registers `pages`; the host consults the
// registry before its own switch, so this composition is what renders /modules.
import { modulesPage } from './pages/modules.page.js';

export { modulesPage, type ModulesPageData, type ModulesPageEntry } from './pages/modules.page.js';

export const pages = [modulesPage];
