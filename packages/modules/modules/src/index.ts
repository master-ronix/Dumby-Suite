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
