import { personaCommand } from './commands/persona.command.js';
import { personaDirectory, RESIDENT_PROFILE_ID } from './services/persona-directory.js';

export const MODULE_SLUG = 'persona';

export const MODULE_DESCRIPTION = 'View activated personas and their command inventory.';

/** §1.7 (UR-11) — the module's schema-declared commands; the loader registers them. */
export const commands = [personaCommand];

export type ModuleState = 'loading' | 'ready';

let loads = 0;
let state: ModuleState = 'loading';

export function loadCount(): number {
  return loads;
}

export function currentState(): ModuleState {
  return state;
}

/**
 * UR-20261030-118 — the module PROVIDES its domain to the core.
 *
 * The container handed to `onLoad` is guarded: `register` succeeds only for a token this module's
 * manifest declares in `provides`, so the grant and the code agree by construction.
 */
export async function onLoad(container?: {
  register?: (token: symbol, factory: () => unknown) => unknown;
}): Promise<void> {
  loads += 1;
  container?.register?.(Symbol.for('core.PersonaDirectory'), () => personaDirectory);
}

/** The service tokens this module provides; the manifest declares the same list. */
export const provides = [{ token: 'core.PersonaDirectory', contract: 'PersonaDirectoryService' }];

export { personaDirectory, RESIDENT_PROFILE_ID };

export async function onReady(): Promise<void> {
  state = 'ready';
}

export async function onUnload(): Promise<void> {
  state = 'loading';
}

// UR-20261027-106 — the module OWNS its page. The loader registers `pages`; the host consults the
// registry before its own switch, so this composition is what renders /persona.
import { personaPage } from './pages/persona.page.js';

export { personaPage, type PersonaPageData, type PersonaProfile } from './pages/persona.page.js';

export const pages = [personaPage];
