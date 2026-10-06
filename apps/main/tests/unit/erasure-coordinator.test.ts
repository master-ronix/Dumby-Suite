import { test, expect, describe, vi } from 'vitest';
import { ErasureCoordinator, type ModuleEraser } from '../../src/shared/erasure-coordinator.js';

function makeCoordinator() {
  const auditInsert = vi.fn(async () => undefined);
  const errInsert = vi.fn(async () => undefined);
  const auditKnex = { insert: auditInsert };
  const tblKnex = { insert: errInsert };

  const db = {
    knex: vi.fn((table: string) => (table === 'audit_logs' ? auditKnex : tblKnex)),
  } as never;
  const logger = { info: vi.fn(), error: vi.fn() };
  const erasers = new Map<string, ModuleEraser>();
  const coordinator = new ErasureCoordinator({ db: db as never, logger: logger as never, erasers });
  return { coordinator, erasers, auditInsert, errInsert, db };
}

describe('ErasureCoordinator', () => {
  test('eraseUser runs each registered eraser and logs completion', async () => {
    const { coordinator, erasers } = makeCoordinator();
    erasers.set('health', async () => 3);
    erasers.set('hello-world', async () => 1);

    const results = await coordinator.eraseUser('user-1');
    expect(results).toEqual([
      { moduleSlug: 'health', tablesAffected: 1, rowsDeleted: 3 },
      { moduleSlug: 'hello-world', tablesAffected: 1, rowsDeleted: 1 },
    ]);
  });

  test('eraseGuild records zero rows for an eraser that returns nothing', async () => {
    const { coordinator, erasers } = makeCoordinator();
    erasers.set('health', async () => 0);

    const results = await coordinator.eraseGuild('guild-1');
    expect(results).toEqual([{ moduleSlug: 'health', tablesAffected: 0, rowsDeleted: 0 }]);
  });

  test('a failing module eraser is isolated and reported, others still run', async () => {
    const { coordinator, erasers } = makeCoordinator();
    erasers.set('broken', async () => {
      throw new Error('db gone');
    });
    erasers.set('fine', async () => 2);

    const results = await coordinator.eraseUser('user-1');
    expect(results).toEqual([
      { moduleSlug: 'broken', tablesAffected: 0, rowsDeleted: 0 },
      { moduleSlug: 'fine', tablesAffected: 1, rowsDeleted: 2 },
    ]);
  });

  test('every erasure writes one audit_logs row with the result payload', async () => {
    const { coordinator, erasers, auditInsert } = makeCoordinator();
    erasers.set('health', async () => 5);

    await coordinator.eraseUser('user-9');
    expect(auditInsert).toHaveBeenCalledTimes(1);
    const payload = (auditInsert.mock.calls[0] as Record<string, unknown>[])[0];
    expect(payload).toMatchObject({ source: 'ERASURE_COORDINATOR' });
    expect(JSON.parse(String(payload.afterState))).toHaveProperty('results');
  });
});
