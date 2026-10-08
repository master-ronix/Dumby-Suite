import type { Knex } from 'knex';
import { addTimestamps } from '../migration-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('licenses', (table) => {
    table.string('licenseId').primary();
    table
      .integer('subjectDevId')
      .notNullable()
      .references('devId')
      .inTable('developers')
      .onDelete('CASCADE');
    table
      .enu('tierClass', ['admin', 'core', 'standard', 'marketplace'], {
        useNative: true,
        enumName: 'license_tier_class',
      })
      .notNullable()
      .defaultTo('standard');
    table
      .enu('state', ['pending', 'under-review', 'approved', 'suspended', 'restored', 'revoked'], {
        useNative: true,
        enumName: 'license_state',
      })
      .notNullable()
      .defaultTo('pending');
    table.string('approvedBy').nullable();
    table.timestamp('approvedAt', { useTz: true }).nullable();
    table.string('suspendedBy').nullable();
    table.timestamp('suspendedAt', { useTz: true }).nullable();
    table.text('suspensionReason').nullable();
    table.boolean('forceDisabled').nullable();
    table.string('restoredBy').nullable();
    table.timestamp('restoredAt', { useTz: true }).nullable();
    table.string('revokedBy').nullable();
    table.timestamp('revokedAt', { useTz: true }).nullable();
    table.text('revocationReason').nullable();
    table.string('verifiedFingerprint').nullable();
    addTimestamps(knex, table);
    table.unique(['subjectDevId']);
  });

  await knex.schema.createTable('compatibility_contracts', (table) => {
    table.string('contractId').primary();
    table.string('currentVersion').notNullable();
    addTimestamps(knex, table);
  });

  await knex.schema.createTable('compatibility_windows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .string('contractId')
      .notNullable()
      .references('contractId')
      .inTable('compatibility_contracts')
      .onDelete('CASCADE');
    table.string('counterpart').notNullable();
    table.string('minInclusive').notNullable();
    table.string('maxExclusive').notNullable();
    table.jsonb('excluded').notNullable().defaultTo(knex.raw("'[]'::jsonb"));
    addTimestamps(knex, table);
    table.index(['counterpart']);
  });

  await knex.schema.createTable('compatibility_provides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .string('contractId')
      .notNullable()
      .references('contractId')
      .inTable('compatibility_contracts')
      .onDelete('CASCADE');
    table.string('counterpart').notNullable();
    table.string('version').notNullable();
    addTimestamps(knex, table);
    table.unique(['counterpart', 'contractId']);
  });

  await knex.schema.createTable('deployment_records', (table) => {
    table.string('recordId').primary();
    table
      .enu('triggerType', ['upload', 'push', 'operator'], {
        useNative: true,
        enumName: 'deployment_trigger_type',
      })
      .notNullable();
    table.string('initiatedBy').notNullable();
    table.string('oidcRepositoryIdentity').nullable();
    table
      .integer('devId')
      .notNullable()
      .references('devId')
      .inTable('developers')
      .onDelete('RESTRICT');
    table.integer('buildId').notNullable();
    table.string('module').notNullable();
    table.string('version').notNullable();
    table
      .enu('validationOutcome', ['passed', 'rejected'], {
        useNative: true,
        enumName: 'deployment_validation_outcome',
      })
      .notNullable();
    table.jsonb('gateOutcomes').notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table
      .enu('promotionResult', ['promoted', 'rolled-back', 'not-attempted'], {
        useNative: true,
        enumName: 'deployment_promotion_result',
      })
      .notNullable();
    table
      .enu('healthCheckOutcome', ['passed', 'failed', 'skipped'], {
        useNative: true,
        enumName: 'deployment_health_check_outcome',
      })
      .notNullable();
    table
      .enu('rollbackResult', ['none', 'success', 'failed'], {
        useNative: true,
        enumName: 'deployment_rollback_result',
      })
      .notNullable();
    table.timestamp('deployedAt', { useTz: true }).nullable();
    addTimestamps(knex, table);
    table.index(['buildId']);
    table.index(['module']);
    table.index(['devId']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('deployment_records');
  await knex.schema.dropTableIfExists('compatibility_provides');
  await knex.schema.dropTableIfExists('compatibility_windows');
  await knex.schema.dropTableIfExists('compatibility_contracts');
  await knex.schema.dropTableIfExists('licenses');
  await knex.raw('drop type if exists deployment_rollback_result');
  await knex.raw('drop type if exists deployment_health_check_outcome');
  await knex.raw('drop type if exists deployment_promotion_result');
  await knex.raw('drop type if exists deployment_validation_outcome');
  await knex.raw('drop type if exists deployment_trigger_type');
  await knex.raw('drop type if exists license_state');
  await knex.raw('drop type if exists license_tier_class');
}
