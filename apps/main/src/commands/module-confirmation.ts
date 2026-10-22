/**
 * The private confirmation a module change sends, and the BCCM scope it belongs to.
 *
 * Kept out of `bootstrap.ts` on purpose. That file is ~1900 lines inside one boot function and is
 * effectively 0% covered, so every branch added there is an uncovered branch against the global floor
 * — the same reason `command-access.ts` was lifted out for its Bearer-token path. Both helpers below
 * are pure, so they belong somewhere they can be exercised.
 */

/** The BCCM scope of an acting identity: '' for the main bot, the persona's application otherwise. */
export function bccmScopeOf(acting: { readonly discordApplicationId: string } | undefined): string {
  return acting?.discordApplicationId ?? '';
}

/** What a member is told after a module change. `installed` and `disabled` read differently. */
export interface ModuleConfirmationInput {
  readonly name: string;
  readonly action: 'installed' | 'disabled';
}

/**
 * The confirmation payload — EPHEMERAL (flags 64) on purpose.
 *
 * A member who installs or disables a module is told so; the channel is not. It goes out as a
 * FOLLOW-UP, because the interaction's one initial response is the page refresh.
 */
export function moduleConfirmationPayload(input: ModuleConfirmationInput): Record<string, unknown> {
  const verb = input.action === 'installed' ? 'installed' : 'disabled';
  const effect =
    input.action === 'installed'
      ? 'Its commands are being registered for this server.'
      : 'Its commands are being removed from this server.';
  return {
    content: `**${input.name}** ${verb} for this server.\n${effect}`,
    flags: 64,
  };
}

/** The display name a confirmation should use: the manifest's, else the slug, else the id given. */
export interface ModuleNameSource {
  readonly manifest?:
    | {
        readonly name?: string | undefined;
        readonly ui?: { readonly displayName?: string | undefined } | undefined;
      }
    | undefined;
}

export function moduleDisplayName(entry: ModuleNameSource | undefined, moduleId: string): string {
  return entry?.manifest?.ui?.displayName ?? entry?.manifest?.name ?? moduleId;
}
