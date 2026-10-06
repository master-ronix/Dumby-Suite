import type { Knex } from 'knex';

/**
 * blueprint.md §22.2 / Table 22-A — `suspendGuild` "immediately blocks the bot from responding to
 * ANY interaction originating in the named guild, fleet-wide, regardless of that guild's own
 * configuration". That control-plane state had no home in the schema, so the function could not
 * be implemented; this table is it. It sits *above* `guild_module_states` (a suspend overrides a
 * guild's own configuration rather than editing it).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_suspensions', (table) => {
    table.string('guildId').primary();
    table.string('suspendedBy').notNullable();
    table.string('reason').notNullable();
    table.bigInteger('suspendedAt').notNullable();
    table.index(['suspendedAt'], 'guild_suspensions_suspended_at_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_suspensions');
}
