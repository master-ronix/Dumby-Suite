import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('metering_usage_daily', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('guildId').nullable();
    table.date('day').notNullable();
    table.bigInteger('bandwidthBytes').notNullable().defaultTo(0);
    table.bigInteger('memoryBytes').notNullable().defaultTo(0);
    table.bigInteger('tokensConsumed').notNullable().defaultTo(0);
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['guildId', 'day']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('metering_usage_daily');
}
