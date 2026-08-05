import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('guild_command_change_queue');
  if (exists) return;
  await knex.schema.createTable('guild_command_change_queue', (table) => {
    table.uuid('id').primary();
    table.string('guildId').notNullable();
    table.string('identityId').nullable();
    table.text('changeType').notNullable();
    table.text('commandKey').notNullable();
    table.text('moduleSlug').notNullable();
    table.text('targetName').nullable();
    table.text('aliasName').nullable();
    table.text('status').notNullable();
    table.timestamp('batchAnchorT0', { useTz: true }).nullable();
    table.timestamp('scheduledPushAt', { useTz: true }).nullable();
    table.timestamp('outerCeilingAt', { useTz: true }).nullable();
    table.jsonb('projectionSnapshot').nullable();
    table.timestamp('invalidatedAt', { useTz: true }).nullable();
    table.text('failureReason').nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable();
    table.timestamp('updatedAt', { useTz: true }).notNullable();
    table.text('createdBy').notNullable();
    table.text('updatedBy').notNullable();
    table.index(['guildId', 'identityId', 'status', 'scheduledPushAt'], 'gccq_due_idx');
    table.index(['moduleSlug', 'changeType', 'status'], 'gccq_module_change_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guild_command_change_queue');
}
