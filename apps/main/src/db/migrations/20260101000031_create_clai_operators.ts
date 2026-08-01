import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clai_authkeys');
  await knex.schema.createTable('clai_operators', (table) => {
    table.uuid('operatorId').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('label').notNullable();
    table.string('sshPublicKeyFingerprint').notNullable();
    table.text('sshPublicKey').notNullable();
    table.string('registeredBy').notNullable();
    table.timestamp('revokedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clai_operators');
  await knex.schema.createTable('clai_authkeys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('ownerId').notNullable();
    table.string('label').notNullable();
    table.text('hashedKey').notNullable();
    table.jsonb('scopes').notNullable().defaultTo('[]');
    table.timestamp('lastUsedAt', { useTz: true }).nullable();
    table.timestamp('revokedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
    table.index(['ownerId']);
  });
}
