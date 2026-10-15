import type { Knex } from 'knex';

/**
 * UR-20261012-028 — the command-permission token is issued by a specific Discord APPLICATION, not
 * by the guild: the endpoint is `/applications/{application.id}/guilds/{guild.id}/commands/...`, and
 * the Bearer token must have been granted by that same application. With personas arriving as
 * separate applications, the store's key must become (applicationId, guildId) rather than guildId.
 *
 * A legacy row (written before this migration) has no application id and is therefore unusable under
 * the new key; it is left in place rather than deleted, and adopted at boot by `adoptLegacy` once the
 * running application's id is known (a migration has no access to config).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guild_command_permission_tokens', (table) => {
    table.string('applicationId').notNullable().defaultTo('');
  });
  await knex.schema.alterTable('guild_command_permission_tokens', (table) => {
    table.dropPrimary();
    table.primary(['applicationId', 'guildId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guild_command_permission_tokens', (table) => {
    table.dropPrimary();
    table.primary(['guildId']);
  });
  await knex.schema.alterTable('guild_command_permission_tokens', (table) => {
    table.dropColumn('applicationId');
  });
}
