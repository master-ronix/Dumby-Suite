import type { Knex } from 'knex';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolved relative to this file's own location, not process.cwd() — knex's
// string default ('./migrations') breaks depending on which directory a
// script is launched from (e.g. `pnpm run migrate` from the package root
// vs. bootstrap.ts's runtime knex instance in src/db/client.ts).
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

function buildConfig(connectionString: string, poolMax: number, statementTimeoutMs: number): Knex.Config {
  return {
    client: 'pg',
    connection: {
      connectionString,
      statement_timeout: statementTimeoutMs,
    },
    pool: { min: 2, max: poolMax },
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  };
}

const databaseUrl = process.env['DATABASE_URL'] ?? '';
const poolMax = Number(process.env['DATABASE_POOL_MAX'] ?? 10);
const statementTimeoutMs = Number(process.env['DATABASE_STATEMENT_TIMEOUT'] ?? 15_000);

const config: Record<string, Knex.Config> = {
  development: buildConfig(databaseUrl, poolMax, statementTimeoutMs),
  test: buildConfig(databaseUrl, 5, 5000),
  production: buildConfig(databaseUrl, poolMax, statementTimeoutMs),
};

export default config;
