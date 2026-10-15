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
  /**
   * Resolves a guild. May be async, so an implementation can FETCH a guild the cache has not seen
   * rather than reporting its members absent — a cold cache must not read as "not in this guild".
   */
  getGuild: (guildId: string) => PresenceGuild | undefined | Promise<PresenceGuild | undefined>;
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
    const guild = await deps.getGuild(guildId);
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
  guilds: {
    cache: { get: (guildId: string) => PresenceGuild | undefined };
    /** Optional: present on a discord.js Client, so a cold cache can be fetched. */
    fetch?: (guildId: string) => Promise<PresenceGuild>;
  };
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
    getGuild: async (guildId) => {
      const client = getClient();
      if (client === undefined) return undefined;
      const cached = client.guilds.cache.get(guildId);
      if (cached !== undefined) return cached;
      // A cold cache is not "absent" — ask Discord before saying so.
      if (client.guilds.fetch === undefined) return undefined;
      try {
        return await client.guilds.fetch(guildId);
      } catch {
        return undefined;
      }
    },
    onError: (guildId, applicationId, err) =>
      warn(`persona-presence-check-failed guild=${guildId} app=${applicationId}: ${String(err)}`),
  });
}
