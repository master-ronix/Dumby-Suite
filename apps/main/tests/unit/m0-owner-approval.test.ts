import { describe, expect, test } from 'vitest';
import { InMemoryApprovalStore } from '../../src/db/repositories/approval.repository.js';
import { decideApproval } from '../../src/governance/approval.js';
import { createPendingLicense } from '../../src/licensing/license-machine.js';
import { approveLicenseRecord, licenseFromRow } from '../../src/licensing/license-store.js';

const OPERATORS = ['operator-1', 'operator-2'];

describe('approval decision (§15.8 / §22.5)', () => {
  test('an operator in the allow-list may approve or decline', () => {
    expect(
      decideApproval({
        actorId: 'operator-1',
        subjectType: 'developer',
        subjectId: 'dev-a',
        operatorAllowList: OPERATORS,
        decision: 'approve',
      }),
    ).toEqual({ kind: 'approved' });
    expect(
      decideApproval({
        actorId: 'operator-2',
        subjectType: 'developer',
        subjectId: 'dev-a',
        operatorAllowList: OPERATORS,
        decision: 'decline',
      }),
    ).toEqual({ kind: 'declined' });
  });

  test('a non-operator is refused', () => {
    expect(
      decideApproval({
        actorId: 'dev-b',
        subjectType: 'developer',
        subjectId: 'dev-a',
        operatorAllowList: OPERATORS,
        decision: 'approve',
      }).kind,
    ).toBe('refused');
  });

  test('the subject cannot decide its own approval', () => {
    expect(
      decideApproval({
        actorId: 'operator-1',
        subjectType: 'developer',
        subjectId: 'operator-1',
        operatorAllowList: OPERATORS,
        decision: 'approve',
      }).kind,
    ).toBe('refused');
  });

  test('a service/automation actor is refused even if listed', () => {
    expect(
      decideApproval({
        actorId: 'service',
        subjectType: 'module',
        subjectId: 'foo',
        operatorAllowList: [...OPERATORS, 'service'],
        decision: 'approve',
      }).kind,
    ).toBe('refused');
  });

  test('an empty actor is refused', () => {
    expect(
      decideApproval({
        actorId: '   ',
        subjectType: 'developer',
        subjectId: 'dev-a',
        operatorAllowList: OPERATORS,
        decision: 'approve',
      }).kind,
    ).toBe('refused');
  });
});

describe('approval store (generic, in-memory)', () => {
  test('a pending request is created once and decided in place', async () => {
    const store = new InMemoryApprovalStore();
    await store.requestPending('developer', 'dev-a');
    await store.requestPending('developer', 'dev-a'); // idempotent
    expect((await store.findPending('developer', 'dev-a'))?.status).toBe('pending');
    await store.decide('developer', 'dev-a', 'approved', 'operator-1', 'ok');
    expect(await store.findPending('developer', 'dev-a')).toBeUndefined();
  });

  test('subjects are keyed by (subjectType, subjectId)', async () => {
    const store = new InMemoryApprovalStore();
    await store.requestPending('module', 'dev-a');
    expect(await store.findPending('developer', 'dev-a')).toBeUndefined();
    expect(await store.findPending('module', 'dev-a')).toBeDefined();
  });

  test('a decision with no open request still records a row', async () => {
    const store = new InMemoryApprovalStore();
    await store.decide('developer', 'dev-z', 'declined', 'operator-1', 'no license');
    expect(await store.findPending('developer', 'dev-z')).toBeUndefined();
  });
});

describe('license is authoritative on approval (§15.7)', () => {
  test('approveLicenseRecord drives pending -> under-review -> approved', () => {
    const approved = approveLicenseRecord(createPendingLicense('lic-1', 'dev-a'), 'operator-1', 'ok');
    expect(approved.state).toBe('approved');
    expect(approved.approvedBy).toBe('operator-1');
    expect(approved.approvedAt).toBeDefined();
  });

  test('an already-approved license is returned unchanged', () => {
    const first = approveLicenseRecord(createPendingLicense('lic-1', 'dev-a'), 'operator-1');
    expect(approveLicenseRecord(first, 'operator-1').state).toBe('approved');
  });

  test('a revoked license has no path back to approved', () => {
    const revoked = { ...createPendingLicense('lic-1', 'dev-a'), state: 'revoked' as const };
    expect(approveLicenseRecord(revoked, 'operator-1').state).toBe('revoked');
  });

  test('licenseFromRow maps a database row', () => {
    const record = licenseFromRow({
      licenseId: 'lic-1',
      subjectDevId: 'dev-a',
      tierClass: 'core',
      state: 'pending',
      approvedBy: 'operator-1',
    });
    expect(record.tierClass).toBe('core');
    expect(record.approvedBy).toBe('operator-1');
  });
});
