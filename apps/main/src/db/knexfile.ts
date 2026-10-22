import type { Knex } from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const migrationsDir =
  process.env['KNEX_MIGRATIONS_DIR'] ??
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
// The flow suite pre-compiles migrations to JS (knex cannot import `.ts` under vitest).
const migrationsExtension =
  process.env['KNEX_MIGRATIONS_EXT'] ?? (import.meta.url.endsWith('.ts') ? 'ts' : 'js');

function buildConfig(
  connectionString: string,
  poolMax: number,
  statementTimeoutMs: number,
  connectTimeoutMs: number,
): Knex.Config {
  return {
    client: 'pg',
    connection: {
      connectionString,
      statement_timeout: statementTimeoutMs,
      // pg's own default here is 0 — NO timeout — so a TCP connect to an unreachable or wedged
      // Postgres waits forever. That is a boot that never binds a port and never logs a reason: the
      // host scans, times out, and reports a deploy failure with no cause. Bounded, it fails loudly.
      connectionTimeoutMillis: connectTimeoutMs,
    },
    // `statement_timeout` bounds a query once it is RUNNING; it does nothing while a query waits for a
    // connection. This bounds that wait, so a starved pool is an error rather than a hang.
    // `acquireTimeoutMillis`, not knex's documented `acquireConnectionTimeout`: knex hands this
    // object to tarn VERBATIM, and tarn rejects a key it does not know with
    // "Tarn: unsupported option opt.acquireConnectionTimeout". The type was right and a cast that
    // silenced it turned a compile error into a runtime one.
    pool: { min: 2, max: poolMax, acquireTimeoutMillis: connectTimeoutMs },
    migrations: {
      directory: migrationsDir,
      extension: migrationsExtension,
      tableName: 'knex_migrations',
      loadExtensions: [`.${migrationsExtension}`],
    },
  };
}

const databaseUrl = process.env['DATABASE_URL'] ?? '';
const poolMax = Number(process.env['DATABASE_POOL_MAX'] ?? 10);
const statementTimeoutMs = Number(process.env['DATABASE_STATEMENT_TIMEOUT_MS'] ?? 10_000);
const connectTimeoutMs = Number(process.env['DATABASE_CONNECT_TIMEOUT_MS'] ?? 10_000);

const config: Record<string, Knex.Config> = {
  development: buildConfig(databaseUrl, poolMax, statementTimeoutMs, connectTimeoutMs),
  test: buildConfig(databaseUrl, 5, 5000, connectTimeoutMs),
  production: buildConfig(databaseUrl, poolMax, statementTimeoutMs, connectTimeoutMs),
};

export default config;
