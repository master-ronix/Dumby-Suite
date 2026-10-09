import { test, expect } from 'vitest';
import {
  AppendOnlyDeploymentRecords,
  buildDeploymentRecord,
  DuplicateDeploymentRecordError,
  PromotionDespiteFailedHealthCheckError,
  MissingDeploymentRecordError,
  type DeploymentRecordInput,
  type DeploymentTrigger,
} from '../../src/licensing/deployment-records.js';

const TRIGGER: DeploymentTrigger = {
  type: 'push',
  initiatedBy: 'repo-bot',
  oidcRepositoryIdentity: 'github.com/acme/swastik-deploy',
};
const BASE_INPUT: DeploymentRecordInput = {
  recordId: 'rec_1',
  triggeredBy: TRIGGER,
  devId: 'dev_alpha',
  buildId: 'build_1',
  module: 'moderation',
  version: '1.0.0',
  validationOutcome: 'passed',
  gateOutcomes: {},
  promotionResult: 'promoted',
  healthCheckOutcome: 'passed',
  rollbackResult: 'none',
};

test('append-only store: records can be added and queried but not duplicated', () => {
  const store = new AppendOnlyDeploymentRecords();
  const record = store.appendBuilt(BASE_INPUT);
  expect(record.recordId).toBe('rec_1');
  expect(record.healthCheckOutcome).toBe('passed');
  expect(record.deployedAt).toBeDefined();
  expect(store.find('rec_1')).toBe(record);
  expect(store.assertRecorded('build_1')).toBe(record);
  expect(() => store.appendBuilt(BASE_INPUT)).toThrow(DuplicateDeploymentRecordError);
  expect(store.getAll()).toHaveLength(1);
  expect(() => store.assertRecorded('nonexistent')).toThrow(MissingDeploymentRecordError);
});

test('forModule returns matching records', () => {
  const store = new AppendOnlyDeploymentRecords();
  store.appendBuilt({ ...BASE_INPUT, recordId: 'r1', module: 'a' });
  store.appendBuilt({ ...BASE_INPUT, recordId: 'r2', module: 'b' });
  store.appendBuilt({ ...BASE_INPUT, recordId: 'r3', module: 'a' });
  expect(store.forModule('a')).toHaveLength(2);
  expect(store.forModule('b')).toHaveLength(1);
  expect(store.forModule('z')).toHaveLength(0);
});

test('OIDC identity is preserved for push-triggered deployments', () => {
  const record = buildDeploymentRecord({ ...BASE_INPUT, recordId: 'rec_2' });
  expect(record.triggeredBy.type).toBe('push');
  expect(record.triggeredBy.oidcRepositoryIdentity).toBe('github.com/acme/swastik-deploy');
});

test('a non-promoted deployment does not carry a deployedAt stamp', () => {
  const input: DeploymentRecordInput = {
    ...BASE_INPUT,
    recordId: 'rec_3',
    promotionResult: 'not-attempted',
  };
  const record = buildDeploymentRecord(input);
  expect(record.deployedAt).toBeUndefined();
  expect(record.promotionResult).toBe('not-attempted');
});

test('a promoted deployment whose health check passed carries a deployedAt stamp', () => {
  const record = buildDeploymentRecord({ ...BASE_INPUT, recordId: 'rec_4' });
  expect(record.deployedAt).toBeDefined();
});

test('a promoted deployment with a failed health check is refused', () => {
  expect(() =>
    buildDeploymentRecord({ ...BASE_INPUT, recordId: 'rec_5', healthCheckOutcome: 'failed' }),
  ).toThrow(PromotionDespiteFailedHealthCheckError);
});

test('non-standard health check defaults to skipped, rollback defaults to none', () => {
  const input: DeploymentRecordInput = {
    recordId: 'rec_6',
    triggeredBy: TRIGGER,
    devId: 'dev_alpha',
    buildId: 'build_1',
    module: 'moderation',
    version: '1.0.0',
    validationOutcome: 'passed',
    gateOutcomes: {},
    promotionResult: 'not-attempted',
  };
  const record = buildDeploymentRecord(input);
  expect(record.healthCheckOutcome).toBe('skipped');
  expect(record.rollbackResult).toBe('none');
});

test('append-only store exposes no mutable surface — getAll returns a defensive copy', () => {
  const store = new AppendOnlyDeploymentRecords();
  store.appendBuilt({ ...BASE_INPUT, recordId: 'r1' });
  const snapshot = store.getAll();
  expect(snapshot).toHaveLength(1);
  (snapshot as unknown as unknown[]).push('poison');
  expect(store.getAll()).toHaveLength(1);
});
