import { test, expect, describe } from 'vitest';
import knexConfig from '../../src/db/knexfile.js';

/**
 * A boot that cannot reach Postgres must FAIL, not hang.
 *
 * `statement_timeout` bounds a query once it is RUNNING. It does nothing while pg is still opening the
 * TCP connection, and nothing while a query waits for a free pool connection. pg defaults its own
 * connect timeout to 0 — no timeout at all — so an unreachable or wedged database produced a boot that
 * printed nothing, never bound its port, and was reported by the host fifteen minutes later as a
 * deploy failure with no cause in the log.
 *
 * These cases pin both bounds, because removing either silently restores the hang.
 */
describe('the database pool is bounded', () => {
  const config = knexConfig.production as {
    connection: { connectionTimeoutMillis?: number };
    pool: { acquireConnectionTimeout?: number; min?: number; max?: number };
  };

  test('the pg connect has a timeout', () => {
    expect(config.connection.connectionTimeoutMillis).toBeGreaterThan(0);
  });

  test('acquiring a connection from the pool has a timeout', () => {
    expect(config.pool.acquireConnectionTimeout).toBeGreaterThan(0);
  });

  test('the pool still has a real size', () => {
    expect(config.pool.min).toBeGreaterThanOrEqual(1);
    expect(config.pool.max).toBeGreaterThanOrEqual(config.pool.min ?? 0);
  });

  test('the bound is short enough to fail inside a host port scan', () => {
    // The host gives a boot a few minutes at most; a bound near the statement timeout is the point.
    expect(config.connection.connectionTimeoutMillis).toBeLessThanOrEqual(30_000);
    expect(config.pool.acquireConnectionTimeout).toBeLessThanOrEqual(30_000);
  });
});
