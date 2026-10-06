import type { LockStore } from './redis-lock-store.js';

export type StampedeOutcome<T> = { acquired: true; result: T } | { acquired: false };

export class StampedeGuard {
  private static readonly DEFAULT_LOCK_TTL_MS = 30_000;

  constructor(private readonly store: LockStore) {}

  async withLock<T>(
    key: string,
    owner: string,
    recompute: () => Promise<T>,
    lockTtlMs = StampedeGuard.DEFAULT_LOCK_TTL_MS,
  ): Promise<StampedeOutcome<T>> {
    const acquired = await this.store.setNX(key, owner, lockTtlMs);
    if (!acquired) return { acquired: false };

    try {
      const result = await recompute();
      return { acquired: true, result };
    } finally {
      await this.store.release(key, owner);
    }
  }
}
