import type { Knex } from 'knex';

/**
 * Generic singleton/KV settings table (maintenance mode flag, log-level
 * override, and similar process-wide switches the Power Engine Panel
 * mutates). One row per `key`; `value` is JSONB so callers are not forced
 * to keep adding columns for every new toggle.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('system_state', (table) => {
    table.string('key').primary();
    table.jsonb('value').notNullable().defaultTo('{}');
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('updatedBy').nullable();
  });

  await knex('system_state').insert([
    { key: 'maintenance_mode', value: JSON.stringify({ enabled: false, reason: null }) },
    { key: 'log_level_override', value: JSON.stringify({ level: null }) },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('system_state');
}
