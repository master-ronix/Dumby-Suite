import { Events, type Client, type Guild } from 'discord.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';

/**
 * Twelve tables declare a foreign key onto `guilds(id)` — guild_members, guild_configs,
 * guild_module_states, guild_command_queue and the rest — so no guild-scoped write can succeed
 * until the guild itself has a row. Nothing registered one, so every such write failed on the
 * foreign key and surfaced as `MODULE_ERROR`: `/queue` could not queue, and `/hello` could not
 * read its module state.
 *
 * Registration is idempotent — a rejoin, a restart or another shard re-merging the same guild
 * updates the existing row rather than colliding on the primary key.
 */
export async function registerGuild(db: DbClient, guild: Guild, logger: Logger): Promise<void> {
  await db
    .knex('guilds')
    .insert({
      id: guild.id,
      name: guild.name,
      ownerDiscordId: guild.ownerId,
      joinedAt: guild.joinedAt ?? new Date(),
    })
    .onConflict('id')
    .merge(['name', 'ownerDiscordId', 'isActive', 'deletedAt']);
  logger.info('guild-registered', { guildId: guild.id, guildName: guild.name });
}

/**
 * Registers every guild the bot is already in, then keeps up with new ones. Must run once the
 * client is ready, because `guilds.cache` is only populated after login.
 */
export async function registerKnownGuilds(
  client: Client,
  db: DbClient,
  logger: Logger,
  /** UR-20261011-023 — run for each guild the moment it joins (register its commands). */
  onGuildJoin?: (guildId: string) => Promise<void>,
): Promise<void> {
  const attempt = (guild: Guild): Promise<void> =>
    registerGuild(db, guild, logger).catch((err) => {
      logger.warn('guild-registration-failed', { guildId: guild.id, error: String(err) });
    });

  await Promise.all([...client.guilds.cache.values()].map((guild) => attempt(guild)));

  client.on(Events.GuildCreate, (guild) => {
    void attempt(guild).then(() =>
      onGuildJoin?.(guild.id).catch((err) => {
        logger.warn('guild-join-deploy-failed', { guildId: guild.id, error: String(err) });
      }),
    );
  });
}
