import type { LockStore } from '../cache/redis-lock-store.js';
import type { Logger } from '../logging/logger.js';

export const SHARD_LOCK_KEY_PREFIX = 'shard:';

/** §23.2 — the shard-ownership lock key: `shard:{shardId}:owner`. */
export function shardLockKey(shardId: number): string {
  return `${SHARD_LOCK_KEY_PREFIX}${shardId}:owner`;
}

/**
 * §23.2 — `SHARD_RANGE` names the contiguous range of shard IDs a pod owns, e.g. `'0-5'`. It is
 * parsed only when `SHARD_COUNT > 1`; a single-shard deployment owns shard 0.
 */
export function parseShardRange(range: string): number[] {
  const match = /^(\d+)-(\d+)$/.exec(range.trim());
  if (match === null) {
    throw new RangeError(`SHARD_RANGE must be "<first>-<last>", got "${range}"`);
  }
  const first = Number(match[1]);
  const last = Number(match[2]);
  if (last < first) {
    throw new RangeError(`SHARD_RANGE last (${last}) must not precede first (${first})`);
  }
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export interface ShardOwnershipDeps {
  lockStore: LockStore;
  logger: Logger;
  /** Identifies this process as the lock owner (a pod is identified by host + pid). */
  ownerId: string;
  heartbeatMs: number;
  retryMs: number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * §23.2 / §26.4 — exactly one process holds the live gateway connection per shard. Ownership is a
 * Redis key written with `SET NX` and heartbeated every `SHARD_LOCK_HEARTBEAT_MS`; any pod that does
 * not hold the lock for a shard it is configured to serve waits and retries every
 * `SHARD_LOCK_RETRY_MS`. Discord invalidates a shard's prior session when a second connection for
 * the same shard ID identifies, so this lock is what makes a rolling update's handover safe.
 */
export class ShardOwnershipManager {
  private readonly held = new Set<number>();
  private heartbeatHandle: unknown = null;

  constructor(private readonly deps: ShardOwnershipDeps) {}

  /** Claim each shard, retrying every `SHARD_LOCK_RETRY_MS` until owned or attempts run out. */
  async claim(
    shardIds: readonly number[],
    maxAttempts = Number.POSITIVE_INFINITY,
  ): Promise<number[]> {
    const acquired: number[] = [];
    for (const shardId of shardIds) {
      const key = shardLockKey(shardId);
      let attempt = 0;
      for (;;) {
        attempt += 1;
        const got = await this.deps.lockStore.setNX(key, this.deps.ownerId, this.deps.heartbeatMs);
        if (got) {
          this.held.add(shardId);
          acquired.push(shardId);
          break;
        }
        if (attempt >= maxAttempts) {
          this.deps.logger.warn('shard-lock-unclaimed', { shardId, attempts: attempt });
          break;
        }
        await this.sleep(this.deps.retryMs);
      }
    }
    return acquired;
  }

  startHeartbeat(): void {
    if (this.heartbeatHandle !== null) return;
    const schedule = this.deps.schedule ?? ((fn, ms) => setInterval(fn, ms));
    this.heartbeatHandle = schedule(() => {
      void this.heartbeat();
    }, this.deps.heartbeatMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatHandle === null) return;
    const cancel = this.deps.cancel ?? ((handle) => clearInterval(handle as NodeJS.Timeout));
    cancel(this.heartbeatHandle);
    this.heartbeatHandle = null;
  }

  private async heartbeat(): Promise<void> {
    for (const shardId of [...this.held]) {
      const kept = await this.deps.lockStore.refresh(
        shardLockKey(shardId),
        this.deps.ownerId,
        this.deps.heartbeatMs,
      );
      if (!kept) {
        this.deps.logger.error('shard-lock-lost', { shardId });
        this.held.delete(shardId);
      }
    }
  }

  ownedShards(): number[] {
    return [...this.held];
  }

  async releaseAll(): Promise<void> {
    this.stopHeartbeat();
    for (const shardId of [...this.held]) {
      await this.deps.lockStore.release(shardLockKey(shardId), this.deps.ownerId);
      this.held.delete(shardId);
    }
  }

  private sleep(ms: number): Promise<void> {
    const sleep = this.deps.sleep ?? ((delay) => new Promise<void>((r) => setTimeout(r, delay)));
    return sleep(ms);
  }
}
