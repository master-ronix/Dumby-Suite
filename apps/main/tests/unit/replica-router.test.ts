import { test, expect, vi } from 'vitest';
import { chooseReadPool, probeReplicaLagMs, ReplicaRouter } from '../../src/db/replica-router.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } as never;

test('chooseReadPool falls back to primary when unavailable or lag is unknown/too high', () => {
  expect(chooseReadPool({ replicaAvailable: false, lagMs: 0, maxLagMs: 100 })).toBe('primary');
  expect(chooseReadPool({ replicaAvailable: true, lagMs: null, maxLagMs: 100 })).toBe('primary');
  expect(chooseReadPool({ replicaAvailable: true, lagMs: 50, maxLagMs: 100 })).toBe('replica');
  expect(chooseReadPool({ replicaAvailable: true, lagMs: 150, maxLagMs: 100 })).toBe('primary');
});

test('probeReplicaLagMs parses a numeric lag and nulls for unknown', async () => {
  const knex = { raw: vi.fn().mockResolvedValue({ rows: [{ lag_ms: '42' }] }) } as never;
  expect(await probeReplicaLagMs(knex)).toBe(42);

  const nullKnex = { raw: vi.fn().mockResolvedValue({ rows: [{ lag_ms: null }] }) } as never;
  expect(await probeReplicaLagMs(nullKnex)).toBeNull();

  const emptyKnex = { raw: vi.fn().mockResolvedValue({ rows: [] }) } as never;
  expect(await probeReplicaLagMs(emptyKnex)).toBeNull();
});

test('ReplicaRouter returns the primary when no replicas are configured', async () => {
  const primary = {} as never;
  const router = new ReplicaRouter({ primary, replicas: [], maxLagMs: 100, logger });
  expect(router.hasReplicas()).toBe(false);
  expect(await router.readKnex()).toBe(primary);
});

test('ReplicaRouter reads a healthy replica and caches the lag probe', async () => {
  const primary = {} as never;
  const replica = {} as never;
  const lagProbe = vi.fn().mockResolvedValue(10);
  const router = new ReplicaRouter({
    primary,
    replicas: [replica],
    maxLagMs: 100,
    logger,
    lagProbe,
    now: () => 0,
  });
  expect(await router.readKnex()).toBe(replica);
  expect(lagProbe).toHaveBeenCalledTimes(1);
  await router.readKnex();
  expect(lagProbe).toHaveBeenCalledTimes(1);
});

test('ReplicaRouter falls back to primary when the replica lags', async () => {
  const primary = {} as never;
  const replica = {} as never;
  const lagProbe = vi.fn().mockResolvedValue(500);
  const router = new ReplicaRouter({
    primary,
    replicas: [replica],
    maxLagMs: 100,
    logger,
    lagProbe,
    now: () => 0,
  });
  expect(await router.readKnex()).toBe(primary);
});

test('ReplicaRouter treats a probe failure as untrusted and uses the primary', async () => {
  const primary = {} as never;
  const replica = {} as never;
  const lagProbe = vi.fn().mockRejectedValue(new Error('probe-down'));
  const router = new ReplicaRouter({
    primary,
    replicas: [replica],
    maxLagMs: 100,
    logger,
    lagProbe,
    now: () => 0,
  });
  expect(await router.readKnex()).toBe(primary);
});
