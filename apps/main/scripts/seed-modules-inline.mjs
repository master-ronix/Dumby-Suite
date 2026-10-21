/**
 * In-process module seed — the FALLBACK for when the Swastik service cannot run.
 *
 * UR-20261021-095 — the primary seed (`start-production.mjs`) starts Swastik on loopback and pushes the
 * built bundles through `POST /internal/deploy`. That is the sanctioned flow, and it is what runs when
 * everything is healthy. But it has a single point of failure: if Swastik does not become ready — a
 * permission error on the module root, a port clash, a crash — the seed is skipped entirely and the bot
 * comes up with ZERO modules. That is exactly what happened on Render (`EACCES mkdir
 * /mnt/modules/swastik-staging`).
 *
 * This module removes that dependency WITHOUT changing what a promotion means. It imports the COMPILED
 * deploy handler (`dist/module-system/deploy-request.js`) — the very same `handleDeployRequest` the
 * Swastik route calls — and runs it in this process against the same dependencies. Every check and
 * every artefact is identical: developer approved → licence → module ownership → compatibility ledger →
 * static verify → ADR-006 promotion gate → sign provenance → atomic promote under lock → `builds` row +
 * `deployment_records` row. Nothing is bypassed and nothing is hand-copied.
 *
 * Option A is untouched: the tier volumes under `MODULES_DIR` are still the target and the source of
 * truth. This only changes WHO performs the promotion when Swastik is unavailable.
 *
 * Plain JS so it runs in the production runtime image (no tsx, no `src/` — only `dist/`).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

/** A console-backed logger: the deploy handler only needs info/warn/error. */
const logger = {
  info: (msg, ctx) => console.log(`seed-modules-inline: ${msg}`, ctx ?? ''),
  warn: (msg, ctx) => console.warn(`seed-modules-inline: ${msg}`, ctx ?? ''),
  error: (msg, ctx) => console.error(`seed-modules-inline: ${msg}`, ctx ?? ''),
  debug: () => {},
  trace: () => {},
  fatal: (msg, ctx) => console.error(`seed-modules-inline: ${msg}`, ctx ?? ''),
  child: () => logger,
};

/**
 * Promote every bundle in `dist-modules/` into its tier volume, in this process.
 * Best-effort and idempotent per module: a refusal is reported and the next module is attempted.
 */
/** Every file under `locales/` and `assets/`, as `{ relativePath: base64 }` (§30). */
function collectFiles(dir) {
  const out = {};
  const walk = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = join(abs, entry.name);
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(childAbs, childRel);
      else if (entry.isFile()) out[childRel] = readFileSync(childAbs).toString('base64');
    }
  };
  for (const sub of ['locales', 'assets']) {
    const root = join(dir, sub);
    if (existsSync(root)) walk(root, sub);
  }
  return out;
}

export async function main() {
  const buildRoot = resolve('dist-modules');
  if (!existsSync(buildRoot)) {
    console.warn(`seed-modules-inline: no built modules at ${buildRoot}; skipping`);
    return { promoted: 0, refused: 0 };
  }

  // Loaded lazily so a missing module never breaks the start script's import graph.
  const { parseEnv, pickEnvKeys } = await import('../dist/config/env.schema.js');
  const { DbClient } = await import('../dist/db/client.js');
  const { RedisLockStore } = await import('../dist/cache/redis-lock-store.js');
  const { handleDeployRequest } = await import('../dist/module-system/deploy-request.js');
  const { PostgresDeploymentRecordStore } =
    await import('../dist/db/repositories/deployment-record.repository.js');
  const { buildDeploymentRecord } = await import('../dist/licensing/deployment-records.js');
  const { Redis } = await import('ioredis');

  const env = parseEnv(pickEnvKeys(process.env));
  const db = new DbClient({
    connectionString: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
    criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
    replicaUrls: env.DATABASE_REPLICA_URLS,
    replicaMaxLagMs: env.DATABASE_REPLICA_MAX_LAG_MS,
    logger,
  });
  const redis = new Redis(env.REDIS_URL);

  // An explicit operator decision, never an automatic one. Absent, ADR-006's first-promotion gate
  // stands and every first promotion is refused — the same contract as the Swastik path.
  const humanApproved = process.env.MODULE_SEED_HUMAN_APPROVED === 'true';

  const deps = {
    knex: db.knex,
    stagingVolume: env.SWASTIK_STAGING_VOLUME_PATH,
    modulesDir: env.MODULES_DIR,
    lockStore: new RedisLockStore(redis),
    signingKeyId: env.BUILD_SIGNING_KEY_ID,
    signingPrivateKey: env.BUILD_SIGNING_PRIVATE_KEY,
    logger,
    redact: (value) => (value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '***'),
    audit: async (action, outcome, detail) => {
      try {
        await db.knex('audit_logs').insert({
          actorId: 'swastik',
          source: 'SWASTIK',
          reason: action,
          action,
          outcome,
          rejectionReason: outcome === 'rejected' ? String(detail['error'] ?? 'unknown') : null,
          metadata: JSON.stringify(detail),
        });
      } catch (err) {
        logger.warn('audit-write-failed', { error: String(err) });
      }
    },
    recordDeployment: async (input) => {
      try {
        await new PostgresDeploymentRecordStore(db.knex).append(
          buildDeploymentRecord({
            recordId: randomUUID(),
            triggeredBy: { type: 'operator', initiatedBy: input.devId },
            devId: input.devId,
            buildId: input.buildId,
            module: input.module,
            version: input.version,
            validationOutcome: 'passed',
            gateOutcomes: { promotion: 'passed' },
            promotionResult: input.promotionResult,
          }),
        );
      } catch (err) {
        logger.warn('deployment-record-failed', { buildId: input.buildId, error: String(err) });
      }
    },
  };

  let promoted = 0;
  let refused = 0;
  for (const slug of readdirSync(buildRoot).sort()) {
    const dir = join(buildRoot, slug);
    const manifestPath = join(dir, 'manifest.json');
    const indexPath = join(dir, 'index.js');
    if (!existsSync(manifestPath) || !existsSync(indexPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      console.warn(`seed-modules-inline: ${slug} has an unreadable manifest: ${String(err)}`);
      refused += 1;
      continue;
    }

    const result = await handleDeployRequest(deps, {
      moduleSlug: manifest.name,
      version: manifest.version,
      devId: manifest.devId ?? 'dev_first_party',
      manifest,
      indexSource: readFileSync(indexPath, 'utf8'),
      files: collectFiles(dir),
      humanApproved,
    });

    if (result.code === 201) {
      promoted += 1;
      console.log(`seed-modules-inline: promoted ${manifest.name}@${manifest.version}`);
    } else {
      refused += 1;
      console.warn(
        `seed-modules-inline: refused ${manifest.name}@${manifest.version} ` +
          `(${result.code}): ${String(result.body.error ?? 'unknown')}`,
      );
    }
  }

  console.log(`seed-modules-inline: ${promoted} module(s) promoted, ${refused} refused`);
  await redis.quit();
  await db.knex.destroy();
  return { promoted, refused };
}
