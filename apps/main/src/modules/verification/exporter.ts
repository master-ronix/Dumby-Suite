import type { Knex } from 'knex';

/**
 * Verification exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportVerificationData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_verification_selftest').whereNull('deletedAt').select('*');
}
