import type { Knex } from 'knex';

/**
 * Binds a developer row to the `credentials` row that authenticates it. `credentialKeyId` names
 * the §22.8 `devId`-purpose credential issued at registration; a NULL means the developer exists
 * but has no usable credential yet. Verification re-checks the binding through the Credentials
 * Service, so repointing this column at another live credential does not authenticate the caller.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('developers', (table) => {
    table.string('credentialKeyId').nullable();
  });
  await knex.raw(
    'create unique index if not exists developers_credential_key_id_uq on ?? ("credentialKeyId") where "credentialKeyId" is not null',
    ['developers'],
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('drop index if exists developers_credential_key_id_uq');
  await knex.schema.alterTable('developers', (table) => {
    table.dropColumn('credentialKeyId');
  });
}
