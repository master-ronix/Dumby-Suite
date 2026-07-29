import type { Knex } from 'knex';

/**
 * Moderation exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportModerationData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_moderation_selftest').whereNull('deletedAt').select('*');
}
