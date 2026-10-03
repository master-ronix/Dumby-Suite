import knexFactory, { type Knex } from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import type { Logger } from '../logging/logger.js';
import { ReplicaRouter } from './replica-router.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

interface TimedQuery {
  __knexQueryUid?: string;
  sql: string;
}

export interface DbClientOptions {
  connectionString: string;
  poolMax: number;
  statementTimeoutMs: number;
  slowQueryThresholdMs: number;
  criticalQueryThresholdMs: number;
  logger: Logger;
  /** §24 — CSV of read-replica connection strings; empty means every read goes to the primary. */
  replicaUrls?: readonly string[] | undefined;
  /** §24 — the replication-lag ceiling above which reads fall back to the primary. */
  replicaMaxLagMs?: number | undefined;
}

export class DbClient {
  /** The primary (write) pool. Reads should prefer `reader()`. */
  readonly knex: Knex;
  private readonly replicas: Knex[];
  private readonly replicaRouter: ReplicaRouter;
  private readonly breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 10_000 });
  private readonly queryStarts = new Map<string, number>();

  constructor(private readonly options: DbClientOptions) {
    this.knex = this.buildPool(options.connectionString, true);
    this.replicas = (options.replicaUrls ?? []).map((url) => this.buildPool(url, false));
    this.replicaRouter = new ReplicaRouter({
      primary: this.knex,
      replicas: this.replicas,
      maxLagMs: options.replicaMaxLagMs ?? 0,
      logger: options.logger,
    });
  }

  private buildPool(connectionString: string, withMigrations: boolean): Knex {
    const pool = knexFactory({
      client: 'pg',
      connection: {
        connectionString,
        statement_timeout: this.options.statementTimeoutMs,
      },
      pool: { min: 2, max: this.options.poolMax },
      ...(withMigrations
        ? {
            migrations: {
              directory: migrationsDir,
              extension: import.meta.url.endsWith('.ts') ? 'ts' : 'js',
              tableName: 'knex_migrations',
              loadExtensions: [import.meta.url.endsWith('.ts') ? '.ts' : '.js'],
            },
          }
        : {}),
    });

    pool.on('query', (query: TimedQuery) => {
      if (query.__knexQueryUid) this.queryStarts.set(query.__knexQueryUid, Date.now());
    });

    pool.on('query-response', (_response: unknown, query: TimedQuery) => {
      const uid = query.__knexQueryUid;
      if (!uid) return;
      const start = this.queryStarts.get(uid);
      this.queryStarts.delete(uid);
      if (start === undefined) return;
      const durationMs = Date.now() - start;
      if (durationMs >= this.options.criticalQueryThresholdMs) {
        this.options.logger.error('critical-slow-query', { sql: query.sql, durationMs });
      } else if (durationMs >= this.options.slowQueryThresholdMs) {
        this.options.logger.warn('slow-query', { sql: query.sql, durationMs });
      }
    });

    return pool;
  }

  /** The primary pool, for any query that must not read stale data. */
  get writer(): Knex {
    return this.knex;
  }

  /**
   * §24 — the read pool: a replica whose lag is within `DATABASE_REPLICA_MAX_LAG_MS`, or the
   * primary when no replica qualifies. Callers that need read-after-write consistency must use
   * `writer` instead.
   */
  async reader(): Promise<Knex> {
    return this.replicaRouter.readKnex();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.breaker.execute(() => this.knex.raw('select 1'));
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    await Promise.all([this.knex.destroy(), ...this.replicas.map((pool) => pool.destroy())]);
  }
}
