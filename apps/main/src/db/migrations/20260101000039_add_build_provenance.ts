import type { Knex } from 'knex';

/**
 * §15.8 "Signed Build Provenance & Load-Time Verification": every accepted build carries full
 * provenance in the `builds` table. All columns are nullable so the migration applies over
 * pre-existing rows, but a row missing any of them is not promotable and the loader refuses to
 * import a directory whose sidecar names such a row (see `swastik-loader.ts`).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('builds', (table) => {
    table.text('sourceArchiveHash').nullable();
    table.text('artifactHash').nullable();
    table.text('lockfileHash').nullable();
    table.text('gateResultsHash').nullable();
    table.jsonb('sbom').nullable();
    table.text('signature').nullable();
    table.string('signatureKeyId').nullable();
    table.text('signedDescriptor').nullable();
    table.index(['artifactHash'], 'builds_artifact_hash_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('builds', (table) => {
    table.dropColumn('sourceArchiveHash');
    table.dropColumn('artifactHash');
    table.dropColumn('lockfileHash');
    table.dropColumn('gateResultsHash');
    table.dropColumn('sbom');
    table.dropColumn('signature');
    table.dropColumn('signatureKeyId');
    table.dropColumn('signedDescriptor');
  });
}
