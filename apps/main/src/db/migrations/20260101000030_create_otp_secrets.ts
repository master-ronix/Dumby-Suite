import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('otp_secrets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('ownerId').notNullable();
    table.text('secretEncrypted').notNullable();
    table.string('algorithm').notNullable().defaultTo('SHA1');
    table.integer('digits').notNullable().defaultTo(6);
    table.integer('period').notNullable().defaultTo(30);
    table.timestamp('revokedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
    table.index(['ownerId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('otp_secrets');
}
