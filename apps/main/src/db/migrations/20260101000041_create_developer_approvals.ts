import type { Knex } from 'knex';

/**
 * §15.8 "Deploy Authorization — Owner Approval, Never Auto-Approval": a refused deploy creates a
 * pending approval request the project owner reviews through the governance API. The CHECK
 * constraint encodes §15.8's rule that no approval actor may be the subject itself or a
 * service/automation; the partial unique index keeps at most one open request per developer.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('developer_approvals', (table) => {
    table.uuid('requestId').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .string('devId')
      .notNullable()
      .references('devId')
      .inTable('developers')
      .onDelete('CASCADE');
    table
      .enu('status', ['pending', 'approved', 'declined'], {
        useNative: true,
        enumName: 'developer_approval_request_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('requestedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.string('decidedBy').nullable();
    table.timestamp('decidedAt', { useTz: true }).nullable();
    table.text('reason').nullable();
    table.index(['devId']);
  });

  await knex.raw(
    `alter table "developer_approvals" add constraint "developer_approvals_actor_check" ` +
      `check ("decidedBy" is null or ("decidedBy" <> "devId" and "decidedBy" not in ` +
      `('service', 'automation', 'credentials-service', 'swastik')))`,
  );
  await knex.raw(
    `create unique index "developer_approvals_pending_uq" on "developer_approvals" ("devId") ` +
      `where "status" = 'pending'`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('developer_approvals');
  await knex.raw('drop type if exists developer_approval_request_status');
}
