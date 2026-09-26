import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sealed_credentials', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('credentialId').notNullable().unique();
    table.string('label').notNullable();
    table.string('registeredBy').notNullable();
    table.text('sealedValue').notNullable();
    table.text('wrappedKey').notNullable();
    table.text('sealIv').notNullable();
    table.text('sealTag').notNullable();
    table.text('wrapIv').notNullable();
    table.text('wrapTag').notNullable();
    table.string('sealAlgorithm').notNullable().defaultTo('AES-256-GCM');
    table.string('sealRootKeyId').notNullable();
    table.timestamp('revokedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
    table.index(['registeredBy']);
    table.index(['sealRootKeyId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sealed_credentials');
}
