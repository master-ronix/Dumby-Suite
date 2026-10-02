import { describe, expect, test } from 'vitest';
import {
  buildDeploymentRecord,
  DuplicateDeploymentRecordError,
  type DeploymentRecord,
} from '../../src/licensing/deployment-records.js';
import {
  deploymentRecordFromRow,
  deploymentRecordToRow,
  InMemoryDeploymentRecordStore,
  PostgresDeploymentRecordStore,
} from '../../src/db/repositories/deployment-record.repository.js';

function sampleRecord(overrides: Partial<Parameters<typeof buildDeploymentRecord>[0]> = {}): DeploymentRecord {
  return buildDeploymentRecord({
    recordId: 'rec-1',
    triggeredBy: { type: 'operator', initiatedBy: 'dev-1' },
    devId: 'dev-1',
    buildId: 'build-1',
    module: 'browse',
    version: '1.2.3',
    validationOutcome: 'passed',
    gateOutcomes: { promotion: 'passed' },
    promotionResult: 'promoted',
    ...overrides,
  });
}

describe('deployment record row mapping (§44.8)', () => {
  test('a promoted record round-trips, including the deployedAt timestamp', () => {
    const record = sampleRecord();
    const row = deploymentRecordToRow(record);
    expect(row.triggerType).toBe('operator');
    expect(row.createdAt).toBe(record.recordedAt);
    expect(deploymentRecordFromRow(row)).toEqual(record);
  });

  test('a rolled-back record has no deployedAt and omits oidc identity', () => {
    const record = sampleRecord({ promotionResult: 'rolled-back' });
    const roundTripped = deploymentRecordFromRow(deploymentRecordToRow(record));
    expect(roundTripped.promotionResult).toBe('rolled-back');
    expect('deployedAt' in roundTripped).toBe(false);
    expect('oidcRepositoryIdentity' in roundTripped.triggeredBy).toBe(false);
  });
});

describe('in-memory deployment record store (wraps AppendOnlyDeploymentRecords)', () => {
  test('append then forBuild/getAll', async () => {
    const store = new InMemoryDeploymentRecordStore();
    await store.append(sampleRecord());
    expect((await store.forBuild('build-1'))?.recordId).toBe('rec-1');
    expect(await store.getAll()).toHaveLength(1);
  });

  test('the append-only invariant is preserved (duplicate recordId refused)', async () => {
    const store = new InMemoryDeploymentRecordStore();
    await store.append(sampleRecord());
    await expect(store.append(sampleRecord())).rejects.toBeInstanceOf(DuplicateDeploymentRecordError);
  });
});

/** Minimal thenable fake of the knex chain the store uses. */
function fakeKnex() {
  const inserted: unknown[] = [];
  let rows: unknown[] = [];
  let mode: 'select' | 'insert' | 'first' = 'select';
  const chain: Record<string, unknown> = {
    insert: (row: unknown) => {
      mode = 'insert';
      inserted.push(row);
      return chain;
    },
    where: () => chain,
    first: () => {
      mode = 'first';
      return chain;
    },
    select: () => {
      mode = 'select';
      return chain;
    },
    then: (resolve: (v: unknown) => void) => {
      resolve(mode === 'select' ? rows : mode === 'first' ? rows[0] : undefined);
    },
  };
  const knex = (() => chain) as unknown as import('knex').Knex;
  return {
    knex,
    inserted,
    setRows: (r: unknown[]) => {
      rows = r;
    },
  };
}

describe('postgres deployment record store (knex adapter)', () => {
  test('append inserts the mapped row', async () => {
    const fake = fakeKnex();
    const store = new PostgresDeploymentRecordStore(fake.knex);
    await store.append(sampleRecord());
    expect(fake.inserted).toHaveLength(1);
    expect(fake.inserted[0]).toMatchObject({ recordId: 'rec-1', triggerType: 'operator', module: 'browse' });
  });

  test('forBuild reads and maps a row', async () => {
    const fake = fakeKnex();
    fake.setRows([deploymentRecordToRow(sampleRecord())]);
    const store = new PostgresDeploymentRecordStore(fake.knex);
    expect((await store.forBuild('build-1'))?.recordId).toBe('rec-1');
  });
});
