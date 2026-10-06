import { healthCommand } from './commands/health.command.js';

export const MODULE_SLUG = 'health';

export const MODULE_DESCRIPTION = 'Displays comprehensive system health and diagnostic information.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [healthCommand];

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
