import { describe, expect, test } from 'vitest';
import { InMemoryDeveloperApprovalStore } from '../../src/db/repositories/developer-approval.repository.js';
import { decideDeveloperApproval } from '../../src/governance/developer-approval.js';

const OWNERS = ['owner-1', 'owner-2'];

describe('developer approval decision (§15.8)', () => {
  test('a project owner may approve or decline', () => {
    expect(
      decideDeveloperApproval({
        actorId: 'owner-1',
        subjectDevId: 'dev-a',
        projectOwnerIds: OWNERS,
        decision: 'approve',
      }),
    ).toEqual({ kind: 'approved' });
    expect(
      decideDeveloperApproval({
        actorId: 'owner-2',
        subjectDevId: 'dev-a',
        projectOwnerIds: OWNERS,
        decision: 'decline',
      }),
    ).toEqual({ kind: 'declined' });
  });

  test('a non-owner is refused', () => {
    const d = decideDeveloperApproval({
      actorId: 'dev-b',
      subjectDevId: 'dev-a',
      projectOwnerIds: OWNERS,
      decision: 'approve',
    });
    expect(d.kind).toBe('refused');
  });

  test('the subject cannot decide their own approval', () => {
    const d = decideDeveloperApproval({
      actorId: 'owner-1',
      subjectDevId: 'owner-1',
      projectOwnerIds: OWNERS,
      decision: 'approve',
    });
    expect(d.kind).toBe('refused');
  });

  test('a service/automation actor is refused even if listed', () => {
    const d = decideDeveloperApproval({
      actorId: 'service',
      subjectDevId: 'dev-a',
      projectOwnerIds: [...OWNERS, 'service'],
      decision: 'approve',
    });
    expect(d.kind).toBe('refused');
  });

  test('an empty actor is refused', () => {
    expect(
      decideDeveloperApproval({
        actorId: '  ',
        subjectDevId: 'dev-a',
        projectOwnerIds: OWNERS,
        decision: 'approve',
      }).kind,
    ).toBe('refused');
  });
});

describe('developer approval store (in-memory)', () => {
  test('a pending request is created once and decided in place', async () => {
    const store = new InMemoryDeveloperApprovalStore();
    await store.requestPending('dev-a');
    await store.requestPending('dev-a'); // idempotent
    expect((await store.findPending('dev-a'))?.status).toBe('pending');
    await store.decide('dev-a', 'approved', 'owner-1', 'looks good');
    const after = await store.findPending('dev-a');
    expect(after).toBeUndefined();
  });

  test('a decision with no open request still records a row', async () => {
    const store = new InMemoryDeveloperApprovalStore();
    await store.decide('dev-z', 'declined', 'owner-1', 'no license');
    expect(await store.findPending('dev-z')).toBeUndefined();
  });
});
