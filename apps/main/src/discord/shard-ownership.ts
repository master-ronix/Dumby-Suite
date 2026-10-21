import type { LockStore } from '../cache/redis-lock-store.js';
import type { Logger } from '../logging/logger.js';

export const SHARD_LOCK_KEY_PREFIX = 'shard:';

/**
 * The lock TTL is a multiple of the heartbeat interval: §26.4 refreshes the TTL *every* heartbeat,
 * so the TTL must outlast the interval. With TTL == heartbeat the key expires at the very instant
 * the first renewal runs (Redis expires it at `heartbeatMs`, and the timer fires at `heartbeatMs`),
 * so `refresh` sees no key and the lock is dropped ~10s after it was claimed.
 */
const HEARTBEAT_TTL_MULTIPLIER = 3;

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
  /** How often the held locks are refreshed. */
  heartbeatMs: number;
  retryMs: number;
  /**
   * The lock TTL. Defaults to `HEARTBEAT_TTL_MULTIPLIER × heartbeatMs`, so the key outlives the
   * renewal interval by a wide margin and a single missed renewal cannot drop the lock.
   */
  ttlMs?: number;
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
/**
 * §23.2 — claim this pod's shard locks, but NEVER let the claim block the boot.
 *
 * `claim()` retries until it owns the shard or its attempts run out. Both outcomes require Redis to
 * ANSWER: when it is unreachable, ioredis holds the command in its offline queue and the promise never
 * settles. The boot then stalls *before* the gateway login, the API server never binds its port, and
 * the platform kills the deploy with "failed to detect open port 8080" — a timeout with no error to
 * read. That is exactly what happened on Render: the seed pushed all 8 modules, then
 * `shard-ownership-claiming` and fourteen minutes of silence.
 *
 * So the claim is raced against a deadline. A deadline is NOT silent: it logs a warning naming the
 * lock store, the boot proceeds with no shards (the gateway still connects), and the port binds — so
 * the platform keeps the service and a health check can report the real state instead of the deploy
 * disappearing into a port-scan timeout.
 */
export async function claimShardsWithin(
  manager: ShardOwnershipManager,
  shardIds: readonly number[],
  logger: Pick<Logger, 'warn'>,
  deadlineMs = 30_000,
): Promise<number[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      manager.claim(shardIds, 30),
      new Promise<number[]>((resolve) => {
        timer = setTimeout(() => {
          logger.warn('shard-claim-deadline-exceeded', {
            shards: shardIds,
            deadlineMs,
            reason: 'the shard lock store did not answer — proceeding without shard ownership',
          });
          resolve([]);
        }, deadlineMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export class ShardOwnershipManager {
  private readonly held = new Set<number>();
  private heartbeatHandle: unknown = null;

  constructor(private readonly deps: ShardOwnershipDeps) {}

  /** The TTL written on claim and on every renewal (see `ShardOwnershipDeps.ttlMs`). */
  private get ttlMs(): number {
    return this.deps.ttlMs ?? this.deps.heartbeatMs * HEARTBEAT_TTL_MULTIPLIER;
  }

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
        const got = await this.deps.lockStore.setNX(key, this.deps.ownerId, this.ttlMs);
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
        this.ttlMs,
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
