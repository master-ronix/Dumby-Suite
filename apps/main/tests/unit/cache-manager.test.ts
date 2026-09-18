import { test, expect, describe, vi, beforeEach } from 'vitest';
import { CacheManager } from '../../src/cache/cache-manager.js';

function makeRedis() {
  const buckets = new Map<string, string>();
  const get = vi.fn(async (key: string) => buckets.get(key) ?? null);
  const set = vi.fn(async (key: string, value: string) => {
    buckets.set(key, value);
    return 'OK';
  });
  const del = vi.fn(async (...keys: string[]) => {
    for (const k of keys) buckets.delete(k);
  });
  const keys = vi.fn(async (pattern: string) =>
    [...buckets.keys()].filter((k) => k.startsWith(pattern.replace('*', ''))),
  );
  const evalFn = vi.fn(async () => 1);
  return { redis: { get, set, del, keys, eval: evalFn } as never, get, set, del, keys, buckets };
}

function makeManager(redis: ReturnType<typeof makeRedis>['redis']) {
  return new CacheManager({
    redis,
    logger: { warn: vi.fn() } as never,
    l1MaxEntries: 10,
  });
}

describe('CacheManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('populates L1 and L2 on a miss and serves subsequent hits from L1', async () => {
    const { redis, set } = makeRedis();
    const manager = makeManager(redis);
    const recompute = vi.fn(async () => ({ value: 42 }));

    const first = await manager.get('k', recompute);
    expect(first).toEqual({ value: 42 });
    expect(recompute).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalled();

    const second = await manager.get('k', recompute);
    expect(second).toEqual({ value: 42 });
    expect(recompute).toHaveBeenCalledTimes(1);
  });

  test('caches null results as a negative sentinel', async () => {
    const { redis, set } = makeRedis();
    const manager = makeManager(redis);
    const recompute = vi.fn(async () => null);

    await manager.get('missing', recompute);
    expect(recompute).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalled();
  });

  test('set writes through to L1 and L2', async () => {
    const { redis, set } = makeRedis();
    const manager = makeManager(redis);
    await manager.set('k', { a: 1 }, 1000);
    expect(set).toHaveBeenCalledWith('k', '{"a":1}', 'PX', 1000);

    const value = await manager.get('k', vi.fn());
    expect(value).toEqual({ a: 1 });
  });

  test('invalidate removes the key from L1 and L2', async () => {
    const { redis, del } = makeRedis();
    const manager = makeManager(redis);
    await manager.set('k', 1);
    await manager.invalidate('k');
    expect(del).toHaveBeenCalledWith('k');

    const recompute = vi.fn(async () => 'fresh');
    expect(await manager.get('k', recompute)).toBe('fresh');
  });

  test('flushNamespace deletes matching L2 keys', async () => {
    const { redis, del } = makeRedis();
    const manager = makeManager(redis);
    await manager.flushNamespace('user:');
    expect(del).toHaveBeenCalledTimes(0);
  });

  test('surface l1Stats', () => {
    const { redis } = makeRedis();
    const manager = makeManager(redis);
    expect(manager.l1Stats).toEqual({ size: 0 });
  });
});
