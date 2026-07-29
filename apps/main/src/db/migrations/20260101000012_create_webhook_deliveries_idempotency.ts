import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('webhook_deliveries_idempotency', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('webhookId')
      .notNullable()
      .references('id')
      .inTable('guild_outbound_webhooks')
      .onDelete('CASCADE');
    table.string('idempotencyKey').notNullable();
    table.timestamp('deliveredAt', { useTz: true }).notNullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.unique(['webhookId', 'idempotencyKey']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_deliveries_idempotency');
}
