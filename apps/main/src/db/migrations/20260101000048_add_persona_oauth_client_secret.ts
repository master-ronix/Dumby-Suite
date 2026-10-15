import type { Knex } from 'knex';

/**
 * UR-20261012-030 — a persona is a SEPARATE Discord application, so the command-permissions endpoint
 * for its commands needs a Bearer token issued by THAT application. Minting one requires the
 * persona's own OAuth2 client secret, which the Twill registration supplies.
 *
 * ADR-003 — like the bot token, it is a credential the process must read back, so it is stored
 * envelope-encrypted rather than under a one-way hash. Nullable: a persona registered before this
 * column exists (or without a secret) simply has no Route A authorization, and Route B applies.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.jsonb('oauthClientSecretSealed').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('persona_identities', (table) => {
    table.dropColumn('oauthClientSecretSealed');
  });
}
