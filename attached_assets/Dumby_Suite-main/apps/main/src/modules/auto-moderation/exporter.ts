import type { Knex } from 'knex';

/**
 * AutoModeration exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportAutoModerationData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_auto_moderation_selftest').whereNull('deletedAt').select('*');
}
