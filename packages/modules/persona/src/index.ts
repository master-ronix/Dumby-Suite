import { personaCommand } from './commands/persona.command.js';
import { personaDirectory, RESIDENT_PROFILE_ID } from './services/persona-directory.js';
import { personaPresenceFromClient } from './domain/persona-presence.js';
import { personaInviteUrl, publicBaseFrom } from './domain/persona-invite.js';

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
  // UR-20261031-121 — persona presence is the module's program: whether a persona's bot is actually
  // in its guild is a fact about a persona, and it now lives here rather than in the core.
  container?.register?.(Symbol.for('core.PersonaPresence'), () => personaPresenceFromClient);
  // UR-20261031-121 — the invite link a persona is installed with is the persona module's knowledge:
  // which URL, and whether it carries an authorize step, follows from how a persona is registered.
  container?.register?.(Symbol.for('core.PersonaInvite'), () => ({
    personaInviteUrl,
    publicBaseFrom,
  }));
}

/** The service tokens this module provides; the manifest declares the same list. */
export const provides = [
  { token: 'core.PersonaDirectory', contract: 'PersonaDirectoryService' },
  { token: 'core.PersonaPresence', contract: 'PersonaPresenceFactory' },
  { token: 'core.PersonaInvite', contract: 'PersonaInviteBuilder' },
];

export {
  personaDirectory,
  RESIDENT_PROFILE_ID,
  personaPresenceFromClient,
  personaInviteUrl,
  publicBaseFrom,
};

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
