import type { Knex } from 'knex';

/**
 * UR-20261012-073 — when a persona's OAuth leg last completed successfully.
 *
 * A successful code exchange is PROOF that Discord accepted the persona's redirect URI: the exchange
 * cannot succeed unless the `redirect_uri` the authorize leg sent is one of the application's
 * registered ones. Until now that proof was logged and thrown away, so nothing could tell an operator
 * whether the redirect URL they were asked to register had actually been registered — the one thing
 * standing between a persona and a working combined install+authorize invite.
 *
 * Nullable: absent means "never completed", which is the honest default and the state every existing
 * persona is in.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.timestamp('oauthVerifiedAt').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.dropColumn('oauthVerifiedAt');
  });
}
