import type { Knex } from 'knex';
import type { Logger } from '../logging/logger.js';

export type ReadPoolChoice = 'replica' | 'primary';

/**
 * §24 — reads go to a replica when one is configured and its replication lag is within
 * `DATABASE_REPLICA_MAX_LAG_MS`; otherwise they fall back to the primary. A lagging replica is
 * never read, and an unknown lag is treated as too stale to trust (blueprint: "read replica
 * lagging → router falls back to primary").
 */
export function chooseReadPool(args: {
  replicaAvailable: boolean;
  lagMs: number | null;
  maxLagMs: number;
}): ReadPoolChoice {
  if (!args.replicaAvailable) return 'primary';
  if (args.lagMs === null) return 'primary';
  return args.lagMs <= args.maxLagMs ? 'replica' : 'primary';
}

/**
 * §24 — the replica's replay lag in milliseconds, read from PostgreSQL's own WAL-replay timestamp.
 * A replica that has never replayed a transaction reports null, which the router treats as
 * untrusted.
 */
export async function probeReplicaLagMs(knex: Knex): Promise<number | null> {
  const result = (await knex.raw(
    'select extract(epoch from (now() - pg_last_xact_replay_timestamp())) * 1000 as lag_ms',
  )) as { rows?: Array<{ lag_ms: number | string | null }> };
  const lag = result.rows?.[0]?.lag_ms;
  if (lag === null || lag === undefined) return null;
  return Number(lag);
}

export interface ReplicaRouterDeps {
  primary: Knex;
  replicas: readonly Knex[];
  maxLagMs: number;
  logger: Logger;
  lagProbe?: (knex: Knex) => Promise<number | null>;
  /** How long a probed lag reading is reused before it is re-read (default 5000ms). */
  lagCacheTtlMs?: number;
  now?: () => number;
}

/**
 * §24 — the read-side router. It round-robins across the configured replicas and returns the first
 * one whose cached lag is within bounds, falling back to the primary when none qualifies. Lag
 * readings are cached for `lagCacheTtlMs` so a read does not pay a probe every time.
 */
export class ReplicaRouter {
  private readonly lagCache = new Map<Knex, { lagMs: number | null; at: number }>();
  private cursor = 0;
  private readonly now: () => number;
  private readonly lagProbe: (knex: Knex) => Promise<number | null>;
  private readonly cacheTtlMs: number;

  constructor(private readonly deps: ReplicaRouterDeps) {
    this.now = deps.now ?? (() => Date.now());
    this.lagProbe = deps.lagProbe ?? probeReplicaLagMs;
    this.cacheTtlMs = deps.lagCacheTtlMs ?? 5000;
  }

  hasReplicas(): boolean {
    return this.deps.replicas.length > 0;
  }

  private async lagOf(replica: Knex): Promise<number | null> {
    const cached = this.lagCache.get(replica);
    const now = this.now();
    if (cached !== undefined && now - cached.at < this.cacheTtlMs) {
      return cached.lagMs;
    }
    let lagMs: number | null;
    try {
      lagMs = await this.lagProbe(replica);
    } catch (err) {
      this.deps.logger.warn('replica-lag-probe-failed', { error: String(err) });
      lagMs = null;
    }
    this.lagCache.set(replica, { lagMs, at: now });
    return lagMs;
  }

  async readKnex(): Promise<Knex> {
    const { replicas, primary } = this.deps;
    if (replicas.length === 0) return primary;

    for (let offset = 0; offset < replicas.length; offset += 1) {
      const replica = replicas[(this.cursor + offset) % replicas.length]!;
      const lagMs = await this.lagOf(replica);
      const choice = chooseReadPool({
        replicaAvailable: true,
        lagMs,
        maxLagMs: this.deps.maxLagMs,
      });
      if (choice === 'replica') {
        this.cursor = (this.cursor + offset + 1) % replicas.length;
        return replica;
      }
    }

    this.deps.logger.warn('replica-lag-exceeded', {
      maxLagMs: this.deps.maxLagMs,
      replicaCount: replicas.length,
    });
    return primary;
  }
}
