/**
 * Seeds the in-repo first-party Swastik module packages onto the tier volumes
 * through the Swastik promotion path.
 *
 * The seed is a *deploy*, not a copy: every package is posted to
 * `POST /internal/deploy`, which writes the bundle into the
 * `swastik-staging` volume, runs the static load verification, applies the
 * promotion gate (first promotion requires explicit human approval), and only
 * then promotes atomically into the tier volume its manifest declares. This
 * script has no filesystem write path into `MODULES_DIR` at all — a first-party
 * module can never bypass staging, verification, the license gate, or the
 * audit trail (blueprint §15.8, ADR-005).
 *
 * Usage:
 *   pnpm seed:modules --human-approved
 *   pnpm seed:modules --modules health,hello-world --human-approved
 *   pnpm seed:modules --provision-governance --human-approved
 *
 * Flags:
 *   --human-approved         assert operator sign-off; without it the server
 *                            refuses any first promotion (fail-closed).
 *   --modules a,b            restrict the run to these package slugs.
 *   --swastik-url URL        Swastik base URL (default http://127.0.0.1:$SWASTIK_PORT).
 *   --dev-id ID              first-party devId (default $FIRST_PARTY_DEV_ID).
 *   --username NAME          developer username used by --provision-governance.
 *   --provision-governance   upsert the first-party developer + approved license.
 *   --no-build               use the existing dist-modules artifacts as-is.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseEnv, pickEnvKeys } from '../src/config/env.schema.js';
import { createLogger } from '../src/logging/logger.js';
import { DbClient } from '../src/db/client.js';
import { INTERNAL_API_HEADER } from '../src/http/internal-auth.js';
import type { LicenseTierClass } from '../src/licensing/license-machine.js';
import { parseManifest } from '../src/module-system/manifest.schema.js';
import {
  buildAllFirstPartyModulePackages,
  readBuiltFirstPartyModules,
  type BuiltFirstPartyModule,
} from './build-first-party-modules.js';

const DEFAULT_DEV_ID = 'dev_first_party';
const DEFAULT_USERNAME = 'dumby-first-party';
const GOVERNANCE_ACTOR = 'first-party-seed';
/** `core` is the highest tier class the first-party set needs; a license
 * authorizes its own tier and below, so it also covers Standard modules. */
const GOVERNANCE_TIER_CLASS: LicenseTierClass = 'core';

export interface SeedOptions {
  readonly swastikUrl: string;
  readonly internalApiKey: string;
  readonly devId: string;
  readonly username: string;
  readonly humanApproved: boolean;
  readonly provisionGovernance: boolean;
  readonly build: boolean;
  readonly onlySlugs: readonly string[] | null;
}

export class SeedRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedRefusedError';
  }
}

export interface SeedOutcome {
  readonly slug: string;
  readonly version: string;
  readonly tier: string;
  readonly ok: boolean;
  readonly status?: string | undefined;
  readonly liveVolume?: string | undefined;
  readonly error?: string | undefined;
}

function parseFlags(argv: readonly string[]): Map<string, string | true> {
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined || !token.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(token, next);
      i += 1;
    } else {
      flags.set(token, true);
    }
  }
  return flags;
}

export function selectPackages(
  built: readonly BuiltFirstPartyModule[],
  onlySlugs: readonly string[] | null,
): BuiltFirstPartyModule[] {
  if (onlySlugs === null) return [...built];
  const wanted = new Set(onlySlugs);
  const missing = [...wanted].filter((slug) => !built.some((pkg) => pkg.slug === slug));
  if (missing.length > 0) {
    throw new SeedRefusedError(
      `unknown first-party package(s): ${missing.join(', ')}. Known: ${built
        .map((pkg) => pkg.slug)
        .join(', ')}`,
    );
  }
  return built.filter((pkg) => wanted.has(pkg.slug));
}

interface DeployResponseBody {
  readonly status?: string;
  readonly tier?: string;
  readonly liveVolume?: string;
  readonly buildId?: string;
  readonly error?: string;
}

/**
 * Promotes one built package. The payload manifest is re-validated after the
 * `devId` injection: the Swastik route requires `manifest.devId` to equal the
 * deploying developer, so the seeded artifact carries the governance identity
 * it was actually promoted under.
 */
export async function promotePackage(options: {
  readonly pkg: BuiltFirstPartyModule;
  readonly swastikUrl: string;
  readonly internalApiKey: string;
  readonly devId: string;
  readonly humanApproved: boolean;
}): Promise<SeedOutcome> {
  const { pkg, swastikUrl, internalApiKey, devId, humanApproved } = options;
  const payloadManifest = { ...pkg.manifest, devId };
  parseManifest(payloadManifest);
  const indexSource = readFileSync(pkg.builtIndexPath, 'utf8');

  let response: Response;
  try {
    response = await fetch(`${swastikUrl}/internal/deploy`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [INTERNAL_API_HEADER]: internalApiKey,
      },
      body: JSON.stringify({
        moduleSlug: pkg.slug,
        version: pkg.version,
        devId,
        manifest: payloadManifest,
        indexSource,
        humanApproved,
      }),
    });
  } catch (err) {
    return {
      slug: pkg.slug,
      version: pkg.version,
      tier: pkg.tier,
      ok: false,
      error: `swastik unreachable: ${(err as Error).message}`,
    };
  }

  const body = (await response.json().catch(() => ({}))) as DeployResponseBody;
  if (!response.ok) {
    return {
      slug: pkg.slug,
      version: pkg.version,
      tier: pkg.tier,
      ok: false,
      error: body.error ?? `HTTP ${response.status}`,
    };
  }
  return {
    slug: pkg.slug,
    version: pkg.version,
    tier: pkg.tier,
    ok: true,
    status: body.status,
    liveVolume: body.liveVolume,
  };
}

export async function verifyGovernance(db: DbClient, devId: string): Promise<readonly string[]> {
  const dev = await db.knex('developers').where({ devId }).first();
  if (!dev) return [`developer "${devId}" is not registered`];
  const problems: string[] = [];
  if (dev.approvalStatus !== 'approved') {
    problems.push(`developer "${devId}" is ${dev.approvalStatus}, not approved`);
  }
  const license = await db.knex('licenses').where({ subjectDevId: devId }).first();
  if (!license) {
    problems.push(`no license is registered for developer "${devId}"`);
  } else if (license.state !== 'approved') {
    problems.push(`license for "${devId}" is ${license.state}, not approved`);
  }
  return problems;
}

export async function provisionGovernance(
  db: DbClient,
  devId: string,
  username: string,
): Promise<void> {
  const now = new Date();
  await db
    .knex('developers')
    .insert({
      devId,
      username,
      approvalStatus: 'approved',
      approvedAt: now,
      approvedBy: GOVERNANCE_ACTOR,
      updatedAt: now,
    })
    .onConflict('devId')
    .merge({
      approvalStatus: 'approved',
      approvedAt: now,
      approvedBy: GOVERNANCE_ACTOR,
      updatedAt: now,
    });
  await db
    .knex('licenses')
    .insert({
      licenseId: `lic_${devId}`,
      subjectDevId: devId,
      tierClass: GOVERNANCE_TIER_CLASS,
      state: 'approved',
      approvedBy: GOVERNANCE_ACTOR,
      approvedAt: now,
      updatedAt: now,
    })
    .onConflict('subjectDevId')
    .merge({
      tierClass: GOVERNANCE_TIER_CLASS,
      state: 'approved',
      approvedBy: GOVERNANCE_ACTOR,
      approvedAt: now,
      updatedAt: now,
    });
}

export function resolveOptions(argv: readonly string[]): SeedOptions {
  const flags = parseFlags(argv);
  const internalApiKey = process.env['INTERNAL_API_KEY'] ?? '';
  if (internalApiKey.length === 0) {
    throw new SeedRefusedError('INTERNAL_API_KEY is required to call /internal/deploy');
  }
  const env = parseEnv(pickEnvKeys(process.env));
  const onlyModules =
    typeof flags.get('--modules') === 'string' ? String(flags.get('--modules')) : null;
  return {
    swastikUrl:
      typeof flags.get('--swastik-url') === 'string'
        ? String(flags.get('--swastik-url'))
        : `http://127.0.0.1:${env.SWASTIK_PORT}`,
    internalApiKey,
    devId:
      typeof flags.get('--dev-id') === 'string'
        ? String(flags.get('--dev-id'))
        : (process.env['FIRST_PARTY_DEV_ID'] ?? DEFAULT_DEV_ID),
    username:
      typeof flags.get('--username') === 'string'
        ? String(flags.get('--username'))
        : DEFAULT_USERNAME,
    humanApproved: flags.get('--human-approved') === true,
    provisionGovernance: flags.get('--provision-governance') === true,
    build: flags.get('--no-build') !== true,
    onlySlugs:
      onlyModules === null
        ? null
        : onlyModules
            .split(',')
            .map((slug) => slug.trim())
            .filter((slug) => slug.length > 0),
  };
}

async function main(): Promise<void> {
  const options = resolveOptions(process.argv.slice(2));
  const logger = createLogger(process.env['LOG_LEVEL'] ?? 'info');
  const env = parseEnv(pickEnvKeys(process.env));

  const built = options.build
    ? await buildAllFirstPartyModulePackages()
    : readBuiltFirstPartyModules();
  const selected = selectPackages(built, options.onlySlugs);
  if (selected.length === 0) {
    throw new SeedRefusedError('no first-party packages selected for seeding');
  }

  const db = new DbClient({
    connectionString: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    slowQueryThresholdMs: env.SLOW_QUERY_THRESHOLD_MS,
    criticalQueryThresholdMs: env.CRITICAL_QUERY_THRESHOLD_MS,
    logger,
  });

  try {
    if (options.provisionGovernance) {
      await provisionGovernance(db, options.devId, options.username);
      logger.info('first-party-governance-provisioned', { devId: options.devId });
    }
    const problems = await verifyGovernance(db, options.devId);
    if (problems.length > 0) {
      throw new SeedRefusedError(
        `${problems.join('; ')}. Re-run with --provision-governance to create the first-party developer and license.`,
      );
    }
  } finally {
    await db.destroy();
  }

  if (!options.humanApproved) {
    process.stdout.write(
      'no --human-approved flag: the server will refuse a first promotion. ' +
        'Re-run with --human-approved once a human has reviewed these artifacts.\n',
    );
  }

  const outcomes: SeedOutcome[] = [];
  for (const pkg of selected) {
    const outcome = await promotePackage({
      pkg,
      swastikUrl: options.swastikUrl,
      internalApiKey: options.internalApiKey,
      devId: options.devId,
      humanApproved: options.humanApproved,
    });
    outcomes.push(outcome);
    if (outcome.ok) {
      process.stdout.write(
        `  promoted ${outcome.slug}@${outcome.version} tier=${outcome.tier} -> ${outcome.liveVolume ?? 'tier volume'} (${outcome.status ?? 'promoted'})\n`,
      );
    } else {
      process.stderr.write(`  FAILED   ${outcome.slug}@${outcome.version}: ${outcome.error}\n`);
    }
  }

  const failed = outcomes.filter((outcome) => !outcome.ok);
  if (failed.length > 0) {
    throw new SeedRefusedError(
      `${failed.length} of ${outcomes.length} first-party module(s) were not promoted: ${failed
        .map((outcome) => outcome.slug)
        .join(', ')}`,
    );
  }
  process.stdout.write(
    `seeded ${outcomes.length} first-party module(s) through Swastik promotion\n`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main().catch((err: unknown) => {
    process.stderr.write(`first-party module seed failed: ${String(err)}\n`);
    process.exit(1);
  });
}
