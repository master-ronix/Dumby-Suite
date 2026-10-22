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
