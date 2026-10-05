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
): Knex.Config {
  return {
    client: 'pg',
    connection: {
      connectionString,
      statement_timeout: statementTimeoutMs,
    },
    pool: { min: 2, max: poolMax },
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

const config: Record<string, Knex.Config> = {
  development: buildConfig(databaseUrl, poolMax, statementTimeoutMs),
  test: buildConfig(databaseUrl, 5, 5000),
  production: buildConfig(databaseUrl, poolMax, statementTimeoutMs),
};

export default config;
