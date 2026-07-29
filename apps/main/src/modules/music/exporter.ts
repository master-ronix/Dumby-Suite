import type { Knex } from 'knex';

/**
 * Music exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportMusicData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_music_selftest').whereNull('deletedAt').select('*');
}
