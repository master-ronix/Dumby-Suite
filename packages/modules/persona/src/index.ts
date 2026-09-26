export const MODULE_SLUG = 'persona';

export const MODULE_DESCRIPTION = 'View activated personas and their command inventory.';

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
