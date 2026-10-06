import { dashboardCommand } from './commands/dashboard.command.js';

export const MODULE_SLUG = 'dashboard';

export const MODULE_DESCRIPTION = 'Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [dashboardCommand];

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
