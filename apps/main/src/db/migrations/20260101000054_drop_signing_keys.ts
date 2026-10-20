import type { Knex } from 'knex';

/**
 * UR-20261019-101 — the loader trusts the per-module `buildId` the deploy flow issued, so the
 * `signing_keys` registry is no longer read anywhere. Drop it. Revocation now targets a module BUILD
 * (`builds.validationStatus = 'rejected'`, set by the admin revoke route), not a signing key.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('signing_keys');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('signing_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('keyId').notNullable().unique();
    table.text('publicKey').notNullable();
    table.string('algorithm').notNullable().defaultTo('Ed25519');
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('revokedAt', { useTz: true }).nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}
