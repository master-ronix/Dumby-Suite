import type { Knex } from 'knex';

/**
 * The ENABLING PROFILE on a module state.
 *
 * Ownership could only ask "is this module enabled?" and then assume the MAIN — which cannot tell
 * "the main bot enabled it" from "a persona enabled it". A persona's install wrote the enabled state,
 * the read answered 'main', and the module the persona had just installed appeared under the main's
 * profile. Recording WHO enabled it makes the answer exact instead of assumed.
 *
 * Nullable: a row written before this column existed has no enabler, and the read falls back to the
 * old rule for it rather than guessing a profile.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guild_module_states', (table) => {
    table.string('enabledBy').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guild_module_states', (table) => {
    table.dropColumn('enabledBy');
  });
}
