/**
 * UR-20261011-018 — the disable confirmation's text and descriptor, kept pure and host-free so they
 * are unit-tested rather than sitting uncovered inside `bootstrap.ts` (which is 0% covered). The host
 * only wires the result into `renderer.render`.
 */

/** The manifest fields the confirmation needs. */
export interface ConfirmableManifest {
  ui?: { displayName?: string | undefined } | undefined;
  name: string;
  commands: readonly { name: string }[];
}

/** The registry entry shape the confirmation reads. */
export interface ConfirmableEntry {
  manifest?: ConfirmableManifest | undefined;
}

export function disableConfirmationSummary(
  displayName: string,
  commandNames: readonly string[],
): string {
  const commands =
    commandNames.length === 0
      ? 'its commands'
      : commandNames.map((name) => `\`/${name}\``).join(', ');
  return `✅ **${displayName}** disabled — ${commands} are hidden and queued for deregistration. Re-enable it from /browse.`;
}

/**
 * The Mode C confirmation descriptor for a disabled module: the surface is the module's display name,
 * the summary names its commands. Resolves a missing entry/manifest to the raw module id.
 */
export function disableConfirmationDescriptor(
  moduleId: string,
  entry: ConfirmableEntry | undefined,
): { surface: string; summary: string } {
  const manifest = entry?.manifest;
  const displayName = manifest?.ui?.displayName ?? manifest?.name ?? moduleId;
  const commandNames = manifest?.commands.map((command) => command.name) ?? [];
  return { surface: displayName, summary: disableConfirmationSummary(displayName, commandNames) };
}

/**
 * The same shape for an ENABLE, so both halves of a module change read alike: a surface naming the
 * module, a summary naming its commands. The install used to send a bare sentence, which is what made
 * it look unlike every other confirmation in the framework.
 */
export function enableConfirmationSummary(
  displayName: string,
  commandNames: readonly string[],
): string {
  const commands =
    commandNames.length === 0
      ? 'its commands'
      : commandNames.map((name) => `\`/${name}\``).join(', ');
  return `✅ **${displayName}** enabled — ${commands} are registered for this server.`;
}

export function enableConfirmationDescriptor(
  moduleId: string,
  entry: ConfirmableEntry | undefined,
): { surface: string; summary: string } {
  const manifest = entry?.manifest;
  const displayName = manifest?.ui?.displayName ?? manifest?.name ?? moduleId;
  const commandNames = manifest?.commands.map((command) => command.name) ?? [];
  return { surface: displayName, summary: enableConfirmationSummary(displayName, commandNames) };
}

/**
 * The notice a REFUSED module change gets — pure, so it is covered rather than sitting in
 * `bootstrap.ts` (0% covered), where every branch counts against the global floor.
 *
 * A module another profile holds is offered in /browse so the operator is TOLD rather than shown a
 * control that vanishes, and selecting it is refused by the install path. That refusal must be
 * answered: it used to leave the interaction unanswered, so selecting an occupied module did nothing.
 */
export interface RefusableOccupancy {
  /** The owning profile id, as `PersonaOccupiedError` carries it: 'main' or a persona id. */
  readonly personaId: string;
}

import { profileLabel } from '../personas/profile-label.js';

export interface ModuleRefusalDescriptor {
  readonly surface: string;
  readonly heading: string;
  readonly explanation: string;
}

export function moduleRefusalDescriptor(
  moduleId: string,
  entry: ConfirmableEntry | undefined,
  error: unknown,
  /** Resolves a persona id to her registered name, so a refusal can name the holder. */
  nameOf?: (personaId: string) => string | undefined,
): ModuleRefusalDescriptor {
  const manifest = entry?.manifest;
  const name = manifest?.ui?.displayName ?? manifest?.name ?? moduleId;
  const occupied =
    typeof error === 'object' && error !== null && 'personaId' in error
      ? (error as RefusableOccupancy)
      : undefined;
  if (occupied === undefined) {
    return {
      surface: name,
      heading: 'Could not install this module',
      explanation:
        'The install was refused before anything changed. Nothing was enabled, and no commands ' +
        'were registered.',
    };
  }
  // "Dumby Profile" or the persona's own name — never "the main bot", which is a role, not a name.
  const owner = profileLabel(occupied.personaId, nameOf?.(occupied.personaId));
  return {
    surface: name,
    heading: 'Already held by another profile',
    explanation:
      `**${name}** is held by ${owner} in this server. A standard-tier module belongs to one ` +
      'profile per server, so it cannot be installed here until that profile releases it — disable ' +
      'or uninstall it there, or ask its owner to.',
  };
}
