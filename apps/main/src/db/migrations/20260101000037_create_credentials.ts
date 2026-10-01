import type { Knex } from 'knex';

/**
 * §22.8 Developer credentials storage: `keyId`, `purpose`, `credentialHash` (Argon2id),
 * `devIdHash`, `status`, `createdAt`, `revokedAt` — one row per issued secret, keyed by
 * `keyId`. `purpose` is a closed enum; the developer identity is persisted only as
 * `devIdHash`, never as a plaintext devId.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credentials', (table) => {
    table.string('keyId').primary();
    table
      .enu(
        'purpose',
        ['devId', 'buildId', 'password', 'service_to_service', 'operator_keypair', 'license_id'],
        { useNative: true, enumName: 'credential_purpose' },
      )
      .notNullable();
    table.text('credentialHash').notNullable();
    table.text('devIdHash').nullable();
    table
      .enu('status', ['pending', 'active', 'revoked'], {
        useNative: true,
        enumName: 'credential_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('revokedAt', { useTz: true }).nullable();
    table.index(['purpose']);
    table.index(['devIdHash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credentials');
  await knex.raw('drop type if exists credential_purpose');
  await knex.raw('drop type if exists credential_status');
}
