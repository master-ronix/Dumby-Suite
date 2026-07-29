import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('backup_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.enu('scope', ['full', 'guild'], { useNative: true, enumName: 'backup_scope' }).notNullable();
    table.string('guildId').nullable();
    table
      .enu('status', ['pending', 'running', 'succeeded', 'failed'], {
        useNative: true,
        enumName: 'backup_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('startedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('completedAt', { useTz: true }).nullable();
    table.bigInteger('sizeBytes').nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('backup_history');
  await knex.raw('drop type if exists backup_scope');
  await knex.raw('drop type if exists backup_status');
}
