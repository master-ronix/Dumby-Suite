/**
 * UR-20261018-093 — backfill module provenance before fail-closed (W3) lands.
 *
 * Every module currently on a tier volume was loaded with NO provenance check (the floor was
 * fail-open). W1 writes sidecars and `builds` rows only for FUTURE promotions, so without this step
 * those already-deployed modules would have neither, and once W3 enforces the floor they would all
 * quarantine on the next boot — an outage.
 *
 * This tool records the CURRENT on-disk artifact of each such module as its provenance baseline. It
 * is NOT trust-on-first-use by default: a module is baselined only when its hash matches a known-good
 * value, taken from `--from-manifest <path>` (the image's `baked-manifest.json`, preferred) or from
 * an explicit `--expect <slug>=sha256:<hex>` (repeatable). A module with no expectation is reported
 * as UNVERIFIED and left alone. `--dry-run` writes nothing and prints the plan; a hash MISMATCH
 * exits non-zero.
 *
 * `--force` accepts the current bytes as the baseline (trust-on-first-use). It is deliberately hard
 * to reach: it requires the environment variable `ALLOW_PROVENANCE_BACKFILL_FORCE=1` and refuses to
 * run when `NODE_ENV=production`.
 *
 *   node dist/scripts/backfill-module-provenance.js --dry-run --from-manifest /app/apps/main/staged-modules/baked-manifest.json
 *   node dist/scripts/backfill-module-provenance.js --from-manifest … --expect third-party-mod=sha256:abc…
 *
 * Run it once, before W2/W3, and verify in staging that every module still loads. Operators of a
 * BAKED image do not need it: `stage-modules.mjs` writes the image build manifest at build time.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv, pickEnvKeys } from '../src/config/env.schema.js';
import { createLogger } from '../src/logging/logger.js';
import { DbClient } from '../src/db/client.js';
import { MODULE_VOLUME_NAMES } from '../src/module-system/swastik-loader.js';
import {
  BUILD_PROVENANCE_SIDECAR,
  hashFile,
  readBuildProvenanceSidecar,
  type BuildProvenanceSidecar,
} from '../src/module-system/build-signing.js';
import { PostgresBuildStore } from '../src/db/repositories/build.repository.js';

const DEFAULT_DEV_ID = 'dev_first_party';
const FORCE_ENV = 'ALLOW_PROVENANCE_BACKFILL_FORCE';

interface Options {
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly fromManifest: string;
  readonly expect: ReadonlyMap<string, string>;
}

function parseArgs(argv: readonly string[]): Options {
  const expect = new Map<string, string>();
  let dryRun = false;
  let force = false;
  let fromManifest = '';
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') dryRun = true;
    else if (token === '--force') force = true;
    else if (token === '--from-manifest') {
      fromManifest = argv[i + 1] ?? '';
      i += 1;
    } else if (token === '--expect') {
      const pair = argv[i + 1] ?? '';
      i += 1;
      const eq = pair.indexOf('=');
      if (eq > 0) expect.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  return { dryRun, force, fromManifest, expect };
}

/** The image manifest is keyed `<volume>/<slug>`; the tool works per slug. */
function loadManifestHashes(path: string): Map<string, string> {
  const out = new Map<string, string>();
  if (path === '' || !existsSync(path)) return out;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>;
    for (const [key, hash] of Object.entries(raw)) out.set(key.split('/').pop() ?? key, hash);
  } catch {
    /* an unreadable manifest yields no expectations */
  }
  return out;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.force) {
    if (process.env[FORCE_ENV] !== '1') {
      console.error(
        `refusing --force: trust-on-first-use requires ${FORCE_ENV}=1 to be set explicitly.`,
      );
      process.exit(2);
    }
    if (process.env['NODE_ENV'] === 'production') {
      console.error('refusing --force under NODE_ENV=production — baseline only verified modules.');
      process.exit(2);
    }
  }

  const env = parseEnv(pickEnvKeys(process.env));
  const logger = createLogger(env.LOG_LEVEL);
  const db = new DbClient({
    connectionString: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
    criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
    logger,
  });
  const store = new PostgresBuildStore(db.knex);
  const modulesDir = env.MODULES_DIR;

  // Expected hashes: the image manifest first, explicit --expect overrides it.
  const expectedBySlug = loadManifestHashes(opts.fromManifest);
  for (const [slug, hash] of opts.expect) expectedBySlug.set(slug, hash);

  let backfilled = 0;
  let skipped = 0;
  let unverified = 0;
  let mismatched = 0;

  for (const volumeName of MODULE_VOLUME_NAMES) {
    const volumePath = join(modulesDir, volumeName);
    if (!existsSync(volumePath)) continue;
    for (const entry of readdirSync(volumePath).sort()) {
      if (entry.startsWith('.') || entry.endsWith('__rollback') || entry.endsWith('__incoming')) {
        continue;
      }
      const moduleDir = join(volumePath, entry);
      const indexPath = join(moduleDir, 'index.js');
      if (!existsSync(indexPath)) {
        logger.warn('backfill-skip-no-index', { volumeName, entry });
        continue;
      }
      const slug = entry.split('__')[0] ?? entry;
      let version = '0.0.0';
      try {
        version =
          (
            JSON.parse(readFileSync(join(moduleDir, 'manifest.json'), 'utf8')) as {
              version?: string;
            }
          ).version ?? version;
      } catch {
        /* a module with no readable manifest still gets a baseline record */
      }

      const existingSidecar = readBuildProvenanceSidecar(moduleDir);
      const existingRow = existingSidecar
        ? await store.findByBuildId(existingSidecar.buildId)
        : undefined;
      if (existingSidecar !== null && existingRow !== undefined) {
        skipped += 1;
        continue;
      }

      const artifactHash = hashFile(indexPath);
      const expected = expectedBySlug.get(slug);

      if (expected !== undefined && expected !== artifactHash) {
        mismatched += 1;
        logger.error('backfill-refused-hash-mismatch', {
          volumeName,
          entry,
          expected,
          actual: artifactHash,
        });
        continue;
      }
      if (expected === undefined && !opts.force) {
        unverified += 1;
        logger.warn('backfill-unverified', {
          volumeName,
          entry,
          actual: artifactHash,
          note: 'no expected hash; pass --from-manifest or --expect <slug>=<hash>',
        });
        continue;
      }
      if (expected === undefined) {
        logger.warn('backfill-force-baseline', { volumeName, entry, actual: artifactHash });
      }

      if (opts.dryRun) {
        logger.info('backfill-would-write', { volumeName, entry, artifactHash });
        backfilled += 1;
        continue;
      }

      try {
        const buildId = `backfill_${slug}_${version}`;
        const sidecar: BuildProvenanceSidecar = {
          buildId,
          moduleSlug: slug,
          version,
          devId: DEFAULT_DEV_ID,
          sourceArchiveHash: '',
          artifactHash,
          lockfileHash: '',
          gateResultsHash: '',
          signature: '',
          signatureKeyId: '',
          signedDescriptor: '',
        };
        writeFileSync(
          join(moduleDir, BUILD_PROVENANCE_SIDECAR),
          JSON.stringify(sidecar, null, 2),
          'utf8',
        );
        const now = new Date();
        await db
          .knex('builds')
          .insert({
            buildId,
            devId: DEFAULT_DEV_ID,
            moduleSlug: slug,
            version,
            validationStatus: 'passed',
            promotedAt: now,
            artifactHash,
          })
          .onConflict('buildId')
          .merge({ artifactHash, promotedAt: now });
        backfilled += 1;
        logger.info('backfill-provenance', { volumeName, entry, buildId, artifactHash });
      } catch (err) {
        logger.error('backfill-failed', { volumeName, entry, error: String(err) });
      }
    }
  }

  logger.info('backfill-complete', {
    dryRun: opts.dryRun,
    backfilled,
    skipped,
    unverified,
    mismatched,
  });
  await db.knex.destroy();
  if (mismatched > 0) process.exit(1);
}

void main();
