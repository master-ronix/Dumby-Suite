import type { Knex } from 'knex';

/**
 * master-prompt.md Conflict 3 (authoritative): Swastik's control tables are
 * named `developers` and `builds` (blueprint §24.2 / directive Rule 27.2),
 * NOT `swastik_developers` / `swastik_builds` (documentation.md's naming).
 *
 * Migrations 000025/000026 shipped the wrong names AND a non-canonical shape
 * (discordUserId/displayName/status, uuid PK). This migration drops those and
 * recreates the canonical core-owned control tables.
 *
 * developers: devId (PK, opaque) · username · approvalStatus
 *             (pending|approved|declined) · registeredAt/approvedAt/approvedBy
 * builds:     buildId (PK) · devId (FK) · moduleSlug · version (semver) ·
 *             validationStatus (pending|passed|rejected) · promotedAt (nullable)
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('swastik_builds');
  await knex.schema.dropTableIfExists('swastik_developers');
  await knex.raw('drop type if exists swastik_build_status');
  await knex.raw('drop type if exists swastik_developer_status');

  await knex.schema.createTable('developers', (table) => {
    table.string('devId').primary();
    table.string('username').notNullable().unique();
    table
      .enu('approvalStatus', ['pending', 'approved', 'declined'], {
        useNative: true,
        enumName: 'developer_approval_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('registeredAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('approvedAt', { useTz: true }).nullable();
    table.string('approvedBy').nullable();
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('builds', (table) => {
    table.string('buildId').primary();
    table
      .string('devId')
      .notNullable()
      .references('devId')
      .inTable('developers')
      .onDelete('CASCADE');
    table.string('moduleSlug').notNullable();
    table.string('version').notNullable();
    table
      .enu('validationStatus', ['pending', 'passed', 'rejected'], {
        useNative: true,
        enumName: 'build_validation_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.timestamp('promotedAt', { useTz: true }).nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['moduleSlug']);
    table.index(['devId']);
    table.unique(['moduleSlug', 'buildId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('builds');
  await knex.schema.dropTableIfExists('developers');
  await knex.raw('drop type if exists build_validation_status');
  await knex.raw('drop type if exists developer_approval_status');

  await knex.schema.createTable('swastik_developers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('discordUserId').notNullable();
    table.string('displayName').notNullable();
    table
      .enu('status', ['active', 'suspended'], {
        useNative: true,
        enumName: 'swastik_developer_status',
      })
      .notNullable()
      .defaultTo('active');
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deletedAt', { useTz: true }).nullable();
    table.string('deletedBy').nullable();
  });

  await knex.schema.createTable('swastik_builds', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('moduleSlug').notNullable();
    table
      .uuid('developerId')
      .notNullable()
      .references('id')
      .inTable('swastik_developers')
      .onDelete('CASCADE');
    table.string('version').notNullable();
    table.string('buildId').notNullable();
    table
      .enu('status', ['pending', 'signed', 'rejected', 'revoked'], {
        useNative: true,
        enumName: 'swastik_build_status',
      })
      .notNullable()
      .defaultTo('pending');
    table.text('artifactRef').nullable();
    table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.index(['moduleSlug']);
    table.index(['developerId']);
    table.unique(['moduleSlug', 'buildId']);
  });
}
