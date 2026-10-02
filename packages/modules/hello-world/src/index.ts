import { helloCommand } from './commands/hello.command.js';

export const MODULE_SLUG = 'hello-world';

export const MODULE_DESCRIPTION =
  'A simple hello world module for testing the Dumby dashboard and module system.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [helloCommand];

export type ModuleState = 'loading' | 'ready';

let loads = 0;
let state: ModuleState = 'loading';

export function loadCount(): number {
  return loads;
}

export function currentState(): ModuleState {
  return state;
}

export function describe(): string {
  return state === 'ready'
    ? MODULE_DESCRIPTION
    : MODULE_DESCRIPTION + ' (loading)';
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
