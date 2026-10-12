/**
 * UR-20261012-029 — persona presence.
 *
 * A Twill-registered persona is a separate Discord application bound to one guild. Whether it is
 * ACTIVE in that guild is not a property of its registration row: it is whether the persona's bot is
 * actually invited and present there. Nothing else in the system can know that, so the /persona page
 * asks at render time.
 *
 * A bot user's id equals its application id, so the main bot can resolve the persona's membership by
 * fetching that id in the guild. The lookup is deliberately total — an absent guild, a missing member
 * or a failed fetch all mean "not present", never an error, because a page must still render.
 */

/** The minimal slice of a Discord guild this needs; keeps the helper unit-testable. */
export interface PresenceGuild {
  members: { fetch: (id: string) => Promise<unknown> };
}

export interface PersonaPresenceDeps {
  /** Resolves a cached guild, or undefined when the guild is not cached. */
  getGuild: (guildId: string) => PresenceGuild | undefined;
  /** Optional logger for the failure path; never throws. */
  onError?: (guildId: string, applicationId: string, error: unknown) => void;
}

/**
 * Builds the presence predicate the page-data layer consumes: true when the persona's bot is a
 * member of the guild, false in every other case.
 */
export function createPersonaPresence(
  deps: PersonaPresenceDeps,
): (guildId: string, applicationId: string) => Promise<boolean> {
  return async (guildId: string, applicationId: string): Promise<boolean> => {
    if (applicationId === '') return false;
    const guild = deps.getGuild(guildId);
    if (guild === undefined) return false;
    try {
      const member = await guild.members.fetch(applicationId);
      return member !== undefined && member !== null;
    } catch (err) {
      deps.onError?.(guildId, applicationId, err);
      return false;
    }
  };
}

/** The client slice the presence lookup needs (a discord.js Client satisfies it structurally). */
export interface PresenceClient {
  guilds: { cache: { get: (guildId: string) => PresenceGuild | undefined } };
}

/**
 * Wires the predicate to a live client. `getClient` is a getter because the client is assigned after
 * the page-data provider is built.
 */
export function personaPresenceFromClient(
  getClient: () => PresenceClient | undefined,
  warn: (message: string) => void,
): (guildId: string, applicationId: string) => Promise<boolean> {
  return createPersonaPresence({
    getGuild: (guildId) => getClient()?.guilds.cache.get(guildId),
    onError: (guildId, applicationId, err) =>
      warn(`persona-presence-check-failed guild=${guildId} app=${applicationId}: ${String(err)}`),
  });
}
