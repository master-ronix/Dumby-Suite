import { permitCommand } from './commands/permit.command.js';

export const MODULE_SLUG = 'permit';

export const MODULE_DESCRIPTION =
  'Manage guild-side grants — permits, whitelists, blacklists, cooldowns, and rate limits.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [permitCommand];

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
// registry before its own switch, so this composition is what renders /permit.
import { permitPage } from './pages/permit.page.js';

export { permitPage, type PermitPageData } from './pages/permit.page.js';

export const pages = [permitPage];
