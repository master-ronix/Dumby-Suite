export const DEPLOYMENT_TRIGGER_TYPES = ['upload', 'push', 'operator'] as const;

export type DeploymentTriggerType = (typeof DEPLOYMENT_TRIGGER_TYPES)[number];

export interface DeploymentTrigger {
  readonly type: DeploymentTriggerType;
  readonly initiatedBy: string;
  readonly oidcRepositoryIdentity?: string;
}

export type OutcomeStatus = 'passed' | 'rejected';

export type PromotionResult = 'promoted' | 'rolled-back' | 'not-attempted';

export type HealthCheckOutcome = 'passed' | 'failed' | 'skipped';

export type RollbackResult = 'none' | 'success' | 'failed';

export interface DeploymentRecord {
  readonly recordId: string;
  readonly triggeredBy: DeploymentTrigger;
  readonly devId: string;
  readonly buildId: string;
  readonly module: string;
  readonly version: string;
  readonly validationOutcome: OutcomeStatus;
  readonly gateOutcomes: Readonly<Record<string, OutcomeStatus>>;
  readonly promotionResult: PromotionResult;
  readonly healthCheckOutcome: HealthCheckOutcome;
  readonly rollbackResult: RollbackResult;
  readonly deployedAt?: string;
  readonly recordedAt: string;
}

export interface DeploymentRecordInput {
  readonly recordId: string;
  readonly triggeredBy: DeploymentTrigger;
  readonly devId: string;
  readonly buildId: string;
  readonly module: string;
  readonly version: string;
  readonly validationOutcome: OutcomeStatus;
  readonly gateOutcomes: Readonly<Record<string, OutcomeStatus>>;
  readonly promotionResult: PromotionResult;
  readonly healthCheckOutcome?: HealthCheckOutcome;
  readonly rollbackResult?: RollbackResult;
}

export class DuplicateDeploymentRecordError extends Error {
  constructor(readonly recordId: string) {
    super(`Deployment record "${recordId}" already exists — records are append-only`);
    this.name = 'DuplicateDeploymentRecordError';
  }
}

export class MissingDeploymentRecordError extends Error {
  constructor(readonly buildId: string) {
    super(
      `No deployment record exists for build "${buildId}" — a deployment that leaves no record did not happen`,
    );
    this.name = 'MissingDeploymentRecordError';
  }
}

export class PromotionDespiteFailedHealthCheckError extends Error {
  constructor(readonly recordId: string) {
    super(`Deployment record "${recordId}" reports promoted but its health check failed`);
    this.name = 'PromotionDespiteFailedHealthCheckError';
  }
}

export function buildDeploymentRecord(input: DeploymentRecordInput): DeploymentRecord {
  const recordedAt = new Date().toISOString();
  const record: DeploymentRecord = {
    recordId: input.recordId,
    triggeredBy: input.triggeredBy,
    devId: input.devId,
    buildId: input.buildId,
    module: input.module,
    version: input.version,
    validationOutcome: input.validationOutcome,
    gateOutcomes: input.gateOutcomes,
    promotionResult: input.promotionResult,
    healthCheckOutcome: input.healthCheckOutcome ?? 'skipped',
    rollbackResult: input.rollbackResult ?? 'none',
    recordedAt,
  };
  if (input.promotionResult === 'promoted') {
    if (input.healthCheckOutcome === 'failed') {
      throw new PromotionDespiteFailedHealthCheckError(
        `${input.buildId} reports promoted while its health check failed`,
      );
    }
    return { ...record, deployedAt: recordedAt };
  }
  return record;
}

export class AppendOnlyDeploymentRecords {
  readonly #records: DeploymentRecord[] = [];

  append(record: DeploymentRecord): void {
    if (this.#records.some((existing) => existing.recordId === record.recordId)) {
      throw new DuplicateDeploymentRecordError(record.recordId);
    }
    this.#records.push(record);
  }

  appendBuilt(input: DeploymentRecordInput): DeploymentRecord {
    const record = buildDeploymentRecord(input);
    this.append(record);
    return record;
  }

  getAll(): readonly DeploymentRecord[] {
    return [...this.#records];
  }

  find(recordId: string): DeploymentRecord | undefined {
    return this.#records.find((record) => record.recordId === recordId);
  }

  forBuild(buildId: string): DeploymentRecord | undefined {
    return this.#records.find((record) => record.buildId === buildId);
  }

  forModule(module: string): readonly DeploymentRecord[] {
    return this.#records.filter((record) => record.module === module);
  }

  assertRecorded(buildId: string): DeploymentRecord {
    const record = this.forBuild(buildId);
    if (record === undefined) {
      throw new MissingDeploymentRecordError(buildId);
    }
    return record;
  }
}
