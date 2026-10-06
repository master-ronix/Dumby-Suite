import type { Knex } from 'knex';

/**
 * §15.8 "Deploy Authorization — Owner Approval, Never Auto-Approval" + "Module Ownership".
 * One generic approvals ledger: every approval request (a refused developer deploy, a module
 * publish, an ownership transfer) is a row here, with the §15.8 actor CHECK — no approval may be
 * decided by the subject itself or by a service/automation — and at most one open request per
 * subject. Supersedes the developer-only `developer_approvals` table (decision A/A/A, pre-deploy).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('approvals', (table) => {
    table.uuid('requestId').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .enu('subjectType', ['developer', 'module', 'ownership_transfer'], {
        useNative: true,
        enumName: 'approval_subject_type',
      })
      .notNullable();
    table.string('subjectId').notNullable();
    table
      .enu('status', ['pending', 'approved', 'declined'], {
        useNative: true,
        enumName: 'approval_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.string('requestedBy').nullable();
    table.string('decidedBy').nullable();
    table.timestamp('decidedAt', { useTz: true }).nullable();
    table.text('reason').nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['subjectType', 'subjectId']);
  });

  await knex.raw(
    `alter table "approvals" add constraint "approvals_actor_check" ` +
      `check ("decidedBy" is null or ("decidedBy" <> "subjectId" and "decidedBy" not in ` +
      `('service', 'automation', 'credentials-service', 'swastik')))`,
  );
  await knex.raw(
    `create unique index "approvals_pending_uq" on "approvals" ("subjectType", "subjectId") ` +
      `where "status" = 'pending'`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('approvals');
  await knex.raw('drop type if exists approval_status');
  await knex.raw('drop type if exists approval_subject_type');
}
