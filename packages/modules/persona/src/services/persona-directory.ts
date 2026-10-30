/**
 * UR-20261030-118 — the persona DOMAIN, provided by the persona module.
 *
 * The core needs to know what a profile is called: the /browse listing, the install refusal and every
 * notice name it. That knowledge is the persona's, and it used to live in
 * `apps/main/src/personas/profile-label.ts` — a file the core imported statically at boot, which is
 * why the domain could not move. The core now declares the contract (`core.PersonaDirectory`) and
 * this module provides the implementation.
 */
export interface PersonaDirectory {
  /** What a profile is called in anything a member reads. */
  label(profileId: string | undefined, personaName?: string | undefined): string;
  /** The resident bot's profile id — the sentinel a persona id can never collide with. */
  readonly residentProfileId: string;
}

/** The resident bot's label. Not "main", not "main bot" — a name a member can act on. */
export const RESIDENT_PROFILE_LABEL = 'Dumby Profile';

/** The sentinel profile id for the resident bot. Cannot collide with a persona id, a UUID. */
export const RESIDENT_PROFILE_ID = 'main';

/**
 * The label for a profile. `personaName` is the registered name when the caller has it; without it a
 * persona is still named as a profile rather than as a role — "Occupied by a persona" makes a member
 * translate a role into a bot, which is what this exists to stop.
 */
export function profileLabel(
  profileId: string | undefined,
  personaName?: string | undefined,
): string {
  if (profileId === undefined || profileId === RESIDENT_PROFILE_ID) return RESIDENT_PROFILE_LABEL;
  return personaName !== undefined && personaName.trim() !== '' ? personaName : 'another profile';
}

/** The implementation this module provides under `core.PersonaDirectory`. */
export const personaDirectory: PersonaDirectory = {
  label: profileLabel,
  residentProfileId: RESIDENT_PROFILE_ID,
};
