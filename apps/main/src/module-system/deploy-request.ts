import type { Knex } from 'knex';
import { parseManifest } from './manifest.schema.js';
import { assertSafeSlug, assertSafeVersion } from '../shared/utils/path-guard.js';
import { PostgresApprovalStore } from '../db/repositories/approval.repository.js';
import { PostgresModuleOwnershipStore } from '../db/repositories/module-ownership.repository.js';
import { licenseAuthorizesDeploy } from '../licensing/license-machine.js';
import { licenseFromRow } from '../licensing/license-store.js';
import {
  checkModuleDeployment,
  CompatibilityLedger,
  type GateOutcome,
  type LedgerContractRecord,
  type LedgerProvidesRecord,
  type LedgerWindowEntry,
} from '../licensing/compatibility-ledger.js';
import { decideModuleOwnership, type ModuleOwnershipStore } from './module-ownership.js';
import { deployModule, type DeployModuleDeps } from './deploy-module.js';

/**
 * The module-deploy REQUEST — parsing, authorisation, and the orchestration.
 *
 * UR-20261021-095 / Option 3, step 2 — extracted from `src/entry/swastik.ts` so the whole
 * `POST /internal/deploy` behaviour (the checks AND the orchestration) is one callable that both the
 * Swastik service and the app's own API run. No check is skipped and nothing is duplicated: the
 * caller supplies the same dependencies the Swastik entry does.
 *
 * Returns an HTTP-shaped result rather than throwing, so a Fastify route is a two-line adapter.
 */

export interface DeployRequestResult {
  readonly code: number;
  readonly body: Record<string, unknown>;
}

/** The runtime compatibility ledger, read from the database. */
export async function runtimeLedger(knex: Knex): Promise<CompatibilityLedger> {
  const contracts = (await knex('compatibility_contracts').select(
    'contractId',
    'currentVersion',
  )) as unknown as LedgerContractRecord[];
  const windows = (await knex('compatibility_windows').select(
    'counterpart',
    'contractId',
    'minInclusive',
    'maxExclusive',
    'excluded',
  )) as unknown as Array<
    Omit<LedgerWindowEntry, 'window'> & {
      minInclusive: string;
      maxExclusive: string;
      excluded: unknown;
    }
  >;
  const provides = (await knex('compatibility_provides').select(
    'counterpart',
    'contractId',
    'version',
  )) as unknown as LedgerProvidesRecord[];
  return CompatibilityLedger.fromJSON({
    formatVersion: 1,
    contracts,
    windows: windows.map((w): LedgerWindowEntry => ({
      counterpart: w.counterpart,
      contractId: w.contractId,
      window: {
        minInclusive: w.minInclusive,
        maxExclusive: w.maxExclusive,
        excluded: Array.isArray(w.excluded) ? (w.excluded as string[]) : [],
      },
    })),
    provides,
  });
}

/** The Compatibility Ledger's verdict on deploying a module. */
export function deploymentGateOutcome(
  ledger: CompatibilityLedger,
  moduleName: string,
): GateOutcome {
  return checkModuleDeployment(ledger, {
    moduleName,
    declaredWindows: ledger.windowsHeldBy(moduleName).map((entry) => ({
      contractId: entry.contractId,
      window: entry.window,
    })),
    coDeployedModuleNames: [],
  });
}

/** §15.8 / UR-C-03 — claim a fresh slug, allow the owner, refuse a non-owner. */
export async function resolveModuleOwnership(
  store: ModuleOwnershipStore,
  slug: string,
  devId: string,
): Promise<{ readonly allowed: boolean }> {
  const existing = await store.findBySlug(slug);
  const decision = decideModuleOwnership(existing, devId);
  if (decision.kind === 'denied') return { allowed: false };
  if (decision.kind === 'claim') await store.claim(slug, devId);
  return { allowed: true };
}

export async function handleDeployRequest(
  deps: DeployModuleDeps,
  rawBody: unknown,
): Promise<DeployRequestResult> {
  const body = (rawBody ?? {}) as Record<string, unknown>;
  const {
    moduleSlug,
    version,
    devId: providedDevId,
    manifest: rawManifest,
  } = body as {
    moduleSlug?: string;
    version?: string;
    devId?: string;
    manifest?: unknown;
    indexSource?: unknown;
  };
  const { indexSource, humanApproved: humanApprovedRaw } = body as {
    indexSource?: unknown;
    humanApproved?: unknown;
  };
  const humanApproved = humanApprovedRaw === true;
  if (!moduleSlug || !version || !providedDevId || !rawManifest) {
    return { code: 400, body: { error: 'moduleSlug, version, devId, and manifest are required' } };
  }
  if (typeof indexSource !== 'string' || indexSource.trim().length === 0) {
    return {
      code: 400,
      body: { error: 'indexSource is required and must contain the compiled module package' },
    };
  }

  let manifest;
  try {
    manifest = parseManifest(rawManifest);
  } catch (err) {
    return { code: 422, body: { error: `manifest validation failed: ${(err as Error).message}` } };
  }

  const safeModuleSlug = assertSafeSlug(moduleSlug);
  const safeModuleVersion = assertSafeVersion(version);

  if (manifest.name !== safeModuleSlug) {
    return { code: 422, body: { error: 'manifest name mismatch' } };
  }
  if (manifest.version !== safeModuleVersion) {
    return { code: 422, body: { error: 'manifest version mismatch' } };
  }
  if (manifest.devId && manifest.devId !== providedDevId) {
    return { code: 422, body: { error: 'manifest devId does not match provided developer' } };
  }

  const dev = await deps.knex('developers').where({ devId: providedDevId }).first();
  if (!dev) {
    return { code: 403, body: { error: 'developer is not registered for deployment' } };
  }
  if (dev.approvalStatus !== 'approved') {
    // §15.8: the attempt creates a pending approval request the owner reviews.
    await new PostgresApprovalStore(deps.knex).requestPending('developer', providedDevId);
    await deps.audit('DEVELOPER_DEPLOY_DENIED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: deps.redact(providedDevId),
    });
    return {
      code: 403,
      body: { error: `developer not approved (status: ${dev.approvalStatus})` },
    };
  }

  const licenseRow = await deps.knex('licenses').where({ subjectDevId: providedDevId }).first();
  if (!licenseRow) {
    return { code: 403, body: { error: 'no license is registered for this developer' } };
  }
  const licenseViolations = licenseAuthorizesDeploy(licenseFromRow(licenseRow), {
    manifestDevId: manifest.devId,
    moduleTier: manifest.tier,
  });
  if (licenseViolations.length > 0) {
    await deps.audit('MODULE_DEPLOY_REJECTED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: deps.redact(providedDevId),
      error: licenseViolations.join('; '),
    });
    return {
      code: 403,
      body: { error: `license gate refused: ${licenseViolations.join('; ')}` },
    };
  }

  // UR-C-03 (§15.8): module ownership applies to deploy as well as upload.
  const deployOwnership = await resolveModuleOwnership(
    new PostgresModuleOwnershipStore(deps.knex),
    safeModuleSlug,
    providedDevId,
  );
  if (!deployOwnership.allowed) {
    await deps.audit('MODULE_DEPLOY_DENIED_NON_OWNER', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: deps.redact(providedDevId),
    });
    return { code: 403, body: { error: 'module is owned by another developer' } };
  }

  const deployGate = deploymentGateOutcome(await runtimeLedger(deps.knex), safeModuleSlug);
  if (!deployGate.allowed) {
    await deps.audit('MODULE_DEPLOY_REJECTED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      devId: deps.redact(providedDevId),
      error: deployGate.violations.join('; '),
    });
    return {
      code: 409,
      body: {
        error: `Compatibility Ledger refused deployment: ${deployGate.violations.join('; ')}`,
      },
    };
  }

  const result = await deployModule(deps, {
    moduleSlug: safeModuleSlug,
    version: safeModuleVersion,
    devId: providedDevId,
    rawManifest,
    manifest,
    indexSource,
    humanApproved,
  });
  if (!result.ok) return { code: result.code, body: { error: result.error } };
  return {
    code: 201,
    body: {
      buildId: result.buildId,
      status: 'promoted',
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      gate: result.gate,
      tier: result.tier,
      liveVolume: result.liveVolume,
      manifest: result.manifest,
    },
  };
}
