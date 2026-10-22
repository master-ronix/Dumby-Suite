/**
 * What a profile is CALLED in anything a member reads.
 *
 * The resident bot was written into user-visible text as "the main bot", and a persona as "a persona"
 * — neither of which is a name. A member reading "Occupied by the main bot in this server" has to
 * translate a role into a bot; the two profiles in a guild are *Dumby Profile* and the persona's own
 * name, which is what the Twill registration carries (`persona_identities.name`).
 *
 * One place, so the /browse listing, the install refusal and every notice agree.
 */

/** The resident bot's label. Not "main", not "main bot" — a name a member can act on. */
export const MAIN_PROFILE_LABEL = 'Dumby Profile';

/** The sentinel profile id for the resident bot. Cannot collide with a persona id, which is a UUID. */
export const MAIN_PROFILE_ID = 'main';

/**
 * The label for a profile. `personaName` is the registered name when the caller has it; without it a
 * persona is still named as a profile rather than as a role.
 */
export function profileLabel(
  profileId: string | undefined,
  personaName?: string | undefined,
): string {
  if (profileId === undefined || profileId === MAIN_PROFILE_ID) return MAIN_PROFILE_LABEL;
  return personaName !== undefined && personaName.trim() !== '' ? personaName : 'another profile';
}
