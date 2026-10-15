import type { Knex } from 'knex';
import { addSoftDelete, addTimestamps } from '../migration-helpers.js';

/**
 * UR-20261011-020 — the per-guild Discord OAuth2 token the dashboard's "Authorize Dumby" flow
 * captures, used to write the guild's command-permission override (Server Settings → Integrations).
 * One row per guild. The access and refresh token VALUES are not stored here: each is sealed at rest
 * and referenced by a `sealed_credentials` id, so a database dump alone never yields a usable token.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('guild_command_permission_tokens', (table) => {
    table.string('guildId').notNullable().references('id').inTable('guilds').onDelete('CASCADE');
    table.string('authorizingUserId').notNullable();
    table.string('accessCredentialId').notNullable();
    table.string('refreshCredentialId').notNullable();
    table.string('scope').notNullable();
    table.timestamp('accessTokenExpiresAt', { useTz: true }).notNullable();
    // active | revoked | expired — 'revoked' is set when Discord answers invalid_grant on refresh.
    table.string('status').notNullable().defaultTo('active');
    table.timestamp('lastRefreshedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
    addSoftDelete(table);
    table.primary(['guildId']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_command_permission_tokens');
}
