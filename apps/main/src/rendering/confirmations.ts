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
