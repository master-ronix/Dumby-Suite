import { describe, expect, test, vi } from 'vitest';
import type { Knex } from 'knex';
import { ReplicaRouter, chooseReadPool, probeReplicaLagMs } from '../../src/db/replica-router.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * §24 — `DATABASE_REPLICA_URLS` and `DATABASE_REPLICA_MAX_LAG_MS` were declared and read by no
 * code. Reads go to a replica when one is configured and its lag is within the ceiling, and fall
 * back to the primary otherwise ("read replica lagging → router falls back to primary").
 */
const logger = createLogger('error');
const fakePool = (name: string) => ({ name }) as unknown as Knex;

describe('M9 env keys — read-replica routing (§24)', () => {
  test('chooseReadPool prefers a replica only within the lag ceiling', () => {
    expect(chooseReadPool({ replicaAvailable: false, lagMs: 0, maxLagMs: 1000 })).toBe('primary');
    expect(chooseReadPool({ replicaAvailable: true, lagMs: null, maxLagMs: 1000 })).toBe('primary');
    expect(chooseReadPool({ replicaAvailable: true, lagMs: 1000, maxLagMs: 1000 })).toBe('replica');
    expect(chooseReadPool({ replicaAvailable: true, lagMs: 1001, maxLagMs: 1000 })).toBe('primary');
  });

  test('probeReplicaLagMs reads the WAL-replay lag, treating null as unknown', async () => {
    const knex = {
      raw: vi.fn().mockResolvedValue({ rows: [{ lag_ms: '250.5' }] }),
    } as unknown as Knex;
    expect(await probeReplicaLagMs(knex)).toBe(250.5);

    const never = { raw: vi.fn().mockResolvedValue({ rows: [{ lag_ms: null }] }) } as unknown as Knex;
    expect(await probeReplicaLagMs(never)).toBeNull();
  });

  test('with no replica configured every read goes to the primary', async () => {
    const primary = fakePool('primary');
    const router = new ReplicaRouter({ primary, replicas: [], maxLagMs: 1000, logger });
    expect(router.hasReplicas()).toBe(false);
    expect(await router.readKnex()).toBe(primary);
  });

  test('a healthy replica is chosen, a lagging one falls back to the primary', async () => {
    const primary = fakePool('primary');
    const replica = fakePool('replica');

    const healthy = new ReplicaRouter({
      primary,
      replicas: [replica],
      maxLagMs: 1000,
      logger,
      lagProbe: async () => 100,
    });
    expect(await healthy.readKnex()).toBe(replica);

    const lagging = new ReplicaRouter({
      primary,
      replicas: [replica],
      maxLagMs: 1000,
      logger,
      lagProbe: async () => 5000,
    });
    expect(await lagging.readKnex()).toBe(primary);
  });

  test('a failed lag probe is treated as untrusted, not as healthy', async () => {
    const primary = fakePool('primary');
    const router = new ReplicaRouter({
      primary,
      replicas: [fakePool('replica')],
      maxLagMs: 1000,
      logger,
      lagProbe: async () => {
        throw new Error('connection refused');
      },
    });
    expect(await router.readKnex()).toBe(primary);
  });

  test('lag readings are cached within the TTL and refreshed after it', async () => {
    const primary = fakePool('primary');
    const replica = fakePool('replica');
    const probe = vi.fn().mockResolvedValue(50);
    let now = 0;
    const router = new ReplicaRouter({
      primary,
      replicas: [replica],
      maxLagMs: 1000,
      logger,
      lagProbe: probe,
      lagCacheTtlMs: 5000,
      now: () => now,
    });

    expect(await router.readKnex()).toBe(replica);
    now = 1000;
    expect(await router.readKnex()).toBe(replica);
    expect(probe).toHaveBeenCalledTimes(1);

    now = 6001;
    expect(await router.readKnex()).toBe(replica);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  test('round-robins across replicas, skipping a lagging one', async () => {
    const primary = fakePool('primary');
    const a = fakePool('a');
    const b = fakePool('b');
    const lags = new Map<Knex, number>([
      [a, 10],
      [b, 5000],
    ]);
    const router = new ReplicaRouter({
      primary,
      replicas: [a, b],
      maxLagMs: 1000,
      logger,
      lagProbe: async (knex) => lags.get(knex) ?? null,
      lagCacheTtlMs: 0,
    });
    expect(await router.readKnex()).toBe(a);
    expect(await router.readKnex()).toBe(a);
    lags.set(b, 20);
    expect(await router.readKnex()).toBe(b);
  });
});
