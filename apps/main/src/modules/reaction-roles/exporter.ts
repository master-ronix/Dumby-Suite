import type { Knex } from 'knex';

/**
 * ReactionRoles exporter registration — returns every self-test row this module
 * has recorded, for a data-export request.
 */
export async function exportReactionRolesData(knex: Knex): Promise<Array<Record<string, unknown>>> {
  return knex('mod_reaction_roles_selftest').whereNull('deletedAt').select('*');
}
