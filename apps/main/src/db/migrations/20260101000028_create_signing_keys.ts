import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('signing_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('keyId').notNullable().unique();
    table.text('publicKey').notNullable();
    table.string('algorithm').notNullable().defaultTo('Ed25519');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('revokedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('signing_keys');
}
