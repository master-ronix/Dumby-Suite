import type { Knex } from 'knex';

/**
 * Tags exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportTagsData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_tags_selftest').whereNull('deletedAt').select('*');
}
