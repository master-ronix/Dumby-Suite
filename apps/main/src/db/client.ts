import knexFactory, { type Knex } from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import type { Logger } from '../logging/logger.js';

// Same resolution as src/db/knexfile.ts — anchored to this file's directory
// so bootstrap's Stage 06 (MIGRATION_RUN) finds the core migrations
// regardless of process.cwd().
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
}

export class DbClient {
  readonly knex: Knex;
  private readonly breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 10_000 });
  private readonly queryStarts = new Map<string, number>();

  constructor(private readonly options: DbClientOptions) {
    this.knex = knexFactory({
      client: 'pg',
      connection: {
        connectionString: options.connectionString,
        statement_timeout: options.statementTimeoutMs,
      },
      pool: { min: 2, max: options.poolMax },
      migrations: {
        directory: migrationsDir,
        extension: 'ts',
        tableName: 'knex_migrations',
      },
    });

    this.knex.on('query', (query: TimedQuery) => {
      if (query.__knexQueryUid) this.queryStarts.set(query.__knexQueryUid, Date.now());
    });

    this.knex.on('query-response', (_response: unknown, query: TimedQuery) => {
      const uid = query.__knexQueryUid;
      if (!uid) return;
      const start = this.queryStarts.get(uid);
      this.queryStarts.delete(uid);
      if (start === undefined) return;
      const durationMs = Date.now() - start;
      if (durationMs >= options.criticalQueryThresholdMs) {
        options.logger.error('critical-slow-query', { sql: query.sql, durationMs });
      } else if (durationMs >= options.slowQueryThresholdMs) {
        options.logger.warn('slow-query', { sql: query.sql, durationMs });
      }
    });
  }

  /** Guarded by a circuit breaker so a Postgres outage fails fast instead of piling up connections. */
  async healthCheck(): Promise<boolean> {
    try {
      await this.breaker.execute(() => this.knex.raw('select 1'));
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    await this.knex.destroy();
  }
}
