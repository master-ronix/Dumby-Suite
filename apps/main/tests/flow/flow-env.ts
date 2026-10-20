import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

/**
 * Flow-suite environment. This module MUST be imported before `bootstrap` — the DB client reads
 * `DATABASE_URL`/migration settings at import time. It fixes the embedded-Postgres port so the URL
 * is known statically, pre-compiles the `.ts` migrations to JS (knex cannot import `.ts` under
 * vitest), and sets the full env the application needs.
 */
export const PG_PORT = 55432;
export const API_PORT = 18900;
export const HEALTH_PORT = 18901;
export const METRICS_PORT = 18902;
export const FLOW_OWNER_ID = '111111111111111111';
export const FLOW_GUILD_ID = '222222222222222222';
export const DATABASE_URL = `postgres://dumby:dumby@localhost:${PG_PORT}/dumby`;

const migrationsSrc = fileURLToPath(new URL('../../src/db/migrations/', import.meta.url));
const migrationsOut = mkdtempSync(join(tmpdir(), 'dumby-migrations-'));
await build({
  entryPoints: readdirSync(migrationsSrc)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(migrationsSrc, f)),
  outdir: migrationsOut,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  external: ['knex'],
  logLevel: 'silent',
});

Object.assign(process.env, {
  NODE_ENV: 'test',
  LOG_LEVEL: 'fatal',
  DISCORD_ADAPTER: 'mock',
  DATABASE_URL,
  DATABASE_REPLICA_URLS: '',
  REDIS_URL: 'redis://localhost:6379',
  QUEUE_REDIS_URL: 'redis://localhost:6379',
  INTERNAL_API_KEY: 'x'.repeat(40),
  ENCRYPTION_ROOT_KEY: Buffer.alloc(32, 7).toString('base64'),
  BOT_OWNER_IDS: FLOW_OWNER_ID,
  DEV_GUILD_ID: FLOW_GUILD_ID,
  POWER_ENGINE_TRUSTED_SOURCES: 'internal',
  POWER_ENGINE_OPERATOR_IDS: FLOW_OWNER_ID,
  MODULES_DIR: mkdtempSync(join(tmpdir(), 'dumby-modules-')),
  KNEX_MIGRATIONS_DIR: migrationsOut,
  KNEX_MIGRATIONS_EXT: 'js',
  SECURITY_POLICY_LOCKFILE: '',
  OPENAPI_CONTRACT_PATH: '',
  OPERATIONAL_RUNBOOKS_DIR: 'docs/runbooks',
  API_PORT: String(API_PORT),
  HEALTH_PORT: String(HEALTH_PORT),
  METRICS_PORT: String(METRICS_PORT),
  // UR-20261019-103 — the module-build signature layer (L2) is MANDATORY at boot, so bootstrap
  // throws unless a verifier is armed. Arm it with an ephemeral Ed25519 keypair (single-line PEM with
  // escaped newlines, the form normalizeSigningKey reads). The flow env's MODULES_DIR is empty, so no
  // module is signed or verified with it — it exists only so the boot can complete.
  BUILD_SIGNING_KEY_ID: 'build-signing-flow',
  BUILD_SIGNING_PUBLIC_KEY: (
    generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }) as string
  )
    .trim()
    .replace(/\n/g, '\\n'),
});
