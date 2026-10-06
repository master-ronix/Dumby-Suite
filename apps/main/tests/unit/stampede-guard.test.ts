import { test, expect } from 'vitest';
import { StampedeGuard } from '../../src/cache/stampede-guard.js';
import { InMemoryLockStore } from '../../src/cache/redis-lock-store.js';

test('the first caller acquires the lock and runs the recompute function', async () => {
  const guard = new StampedeGuard(new InMemoryLockStore());
  const outcome = await guard.withLock('hot-key', 'owner-a', async () => 'fresh-value');
  expect(outcome).toStrictEqual({ acquired: true, result: 'fresh-value' });
});

test('a concurrent second caller is told the lock is held instead of also recomputing', async () => {
  const store = new InMemoryLockStore();
  const guard = new StampedeGuard(store);

  let releaseFirst!: () => void;
  const firstBlocked = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = guard.withLock('hot-key', 'owner-a', async () => {
    await firstBlocked;
    return 'first-result';
  });

  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = await guard.withLock('hot-key', 'owner-b', async () => 'second-result');
  expect(second).toStrictEqual({ acquired: false });

  releaseFirst();
  const firstOutcome = await first;
  expect(firstOutcome).toStrictEqual({ acquired: true, result: 'first-result' });
});

test('the lock is released after the function completes, allowing a later caller through', async () => {
  const guard = new StampedeGuard(new InMemoryLockStore());
  await guard.withLock('hot-key', 'owner-a', async () => 'first');
  const second = await guard.withLock('hot-key', 'owner-b', async () => 'second');
  expect(second).toStrictEqual({ acquired: true, result: 'second' });
});

test('the lock is released even if the guarded function throws', async () => {
  const guard = new StampedeGuard(new InMemoryLockStore());
  await expect(
    guard.withLock('hot-key', 'owner-a', async () => {
      throw new Error('recompute failed');
    }),
  ).rejects.toThrow();
  const second = await guard.withLock('hot-key', 'owner-b', async () => 'recovered');
  expect(second).toStrictEqual({ acquired: true, result: 'recovered' });
});

test('InMemoryLockStore.release is a no-op compare-and-delete: a non-owner cannot release', async () => {
  const store = new InMemoryLockStore();
  await store.setNX('k', 'owner-a', 10_000);
  await store.release('k', 'owner-b');
  const stillLocked = await store.setNX('k', 'owner-c', 10_000);
  expect(stillLocked).toBe(false);
});

test('a lock expires after its TTL and can be re-acquired', async () => {
  let now = 0;
  const store = new InMemoryLockStore(() => now);
  await store.setNX('k', 'owner-a', 100);
  now += 101;
  const reacquired = await store.setNX('k', 'owner-b', 100);
  expect(reacquired).toBe(true);
});
