import type { Knex } from 'knex';

/**
 * §24.5 — every entity table carries `createdAt`, `updatedAt`, `createdBy`, `updatedBy`. This
 * migration backfills the two author columns onto the core entity tables created before §24.5 was
 * enforced (null ⇒ system-generated).
 */
const ENTITY_TABLES = [
  'guilds',
  'users',
  'guild_members',
  'guild_configs',
  'guild_roles',
  'guild_module_states',
  'marketplace_listings',
  'rbac_sets',
  'rbac_groups',
  'rbac_grants',
  'guild_command_overrides',
  'persona_identities',
  'guild_persona_bindings',
] as const;

export async function up(knex: Knex): Promise<void> {
  for (const table of ENTITY_TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.string('createdBy').nullable();
      t.string('updatedBy').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of ENTITY_TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropColumn('createdBy');
      t.dropColumn('updatedBy');
    });
  }
}
