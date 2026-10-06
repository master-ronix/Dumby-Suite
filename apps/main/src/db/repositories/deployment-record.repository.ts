import type { Knex } from 'knex';
import {
  AppendOnlyDeploymentRecords,
  type DeploymentRecord,
  type DeploymentTriggerType,
  type HealthCheckOutcome,
  type OutcomeStatus,
  type PromotionResult,
  type RollbackResult,
} from '../../licensing/deployment-records.js';

/**
 * §44.8 / migration 33 — the `deployment_records` store. `AppendOnlyDeploymentRecords` is the
 * domain shape (append-only, duplicate-refusing); this persists it so a deployment that leaves no
 * record did not happen (finding #8).
 */
export interface DeploymentRecordStore {
  append(record: DeploymentRecord): Promise<void>;
  forBuild(buildId: string): Promise<DeploymentRecord | undefined>;
  getAll(): Promise<readonly DeploymentRecord[]>;
}

export interface DeploymentRecordRow {
  recordId: string;
  triggerType: string;
  initiatedBy: string;
  oidcRepositoryIdentity: string | null;
  devId: string;
  buildId: string;
  module: string;
  version: string;
  validationOutcome: string;
  gateOutcomes: Record<string, string>;
  promotionResult: string;
  healthCheckOutcome: string;
  rollbackResult: string;
  deployedAt: string | null;
  createdAt: string;
}

export function deploymentRecordToRow(record: DeploymentRecord): DeploymentRecordRow {
  return {
    recordId: record.recordId,
    triggerType: record.triggeredBy.type,
    initiatedBy: record.triggeredBy.initiatedBy,
    oidcRepositoryIdentity: record.triggeredBy.oidcRepositoryIdentity ?? null,
    devId: record.devId,
    buildId: record.buildId,
    module: record.module,
    version: record.version,
    validationOutcome: record.validationOutcome,
    gateOutcomes: { ...record.gateOutcomes },
    promotionResult: record.promotionResult,
    healthCheckOutcome: record.healthCheckOutcome,
    rollbackResult: record.rollbackResult,
    deployedAt: record.deployedAt ?? null,
    createdAt: record.recordedAt,
  };
}

export function deploymentRecordFromRow(row: DeploymentRecordRow): DeploymentRecord {
  const oidc = row.oidcRepositoryIdentity;
  return {
    recordId: row.recordId,
    triggeredBy: {
      type: row.triggerType as DeploymentTriggerType,
      initiatedBy: row.initiatedBy,
      ...(oidc === null ? {} : { oidcRepositoryIdentity: oidc }),
    },
    devId: row.devId,
    buildId: row.buildId,
    module: row.module,
    version: row.version,
    validationOutcome: row.validationOutcome as OutcomeStatus,
    gateOutcomes: row.gateOutcomes as Record<string, OutcomeStatus>,
    promotionResult: row.promotionResult as PromotionResult,
    healthCheckOutcome: row.healthCheckOutcome as HealthCheckOutcome,
    rollbackResult: row.rollbackResult as RollbackResult,
    ...(row.deployedAt === null ? {} : { deployedAt: row.deployedAt }),
    recordedAt: row.createdAt,
  };
}

export class PostgresDeploymentRecordStore implements DeploymentRecordStore {
  constructor(private readonly knex: Knex) {}

  async append(record: DeploymentRecord): Promise<void> {
    await this.knex('deployment_records').insert(deploymentRecordToRow(record));
  }

  async forBuild(buildId: string): Promise<DeploymentRecord | undefined> {
    const row = await this.knex('deployment_records').where({ buildId }).first();
    return row === undefined ? undefined : deploymentRecordFromRow(row as DeploymentRecordRow);
  }

  async getAll(): Promise<readonly DeploymentRecord[]> {
    const rows = await this.knex('deployment_records').select('*');
    return rows.map((row) => deploymentRecordFromRow(row as DeploymentRecordRow));
  }
}

/** In-memory store so tests (and the append-only invariant) need no database. */
export class InMemoryDeploymentRecordStore implements DeploymentRecordStore {
  constructor(private readonly records = new AppendOnlyDeploymentRecords()) {}

  async append(record: DeploymentRecord): Promise<void> {
    this.records.append(record);
  }

  async forBuild(buildId: string): Promise<DeploymentRecord | undefined> {
    return this.records.forBuild(buildId);
  }

  async getAll(): Promise<readonly DeploymentRecord[]> {
    return this.records.getAll();
  }
}
