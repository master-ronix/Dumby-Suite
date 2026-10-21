import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Knex } from 'knex';
import type { Logger } from '../logging/logger.js';
import { PostgresBuildStore } from '../db/repositories/build.repository.js';
import { assertPathInside, safeJoin } from '../shared/utils/path-guard.js';
import { TIER_VOLUME_NAMES } from './swastik-loader.js';
import type { ModuleManifest } from './manifest.schema.js';
import type { ModuleTier } from './tier-rules.js';
import {
  decidePromotionGate,
  promoteUnderLock,
  rollbackPromotion,
  verifyStagedBuild,
  type PromotionOutcome,
} from './promotion.js';
import { signProvenance } from './sign-provenance.js';

/**
 * The module-deploy orchestration — the body of `POST /internal/deploy`.
 *
 * UR-20261021-095 / Option 3 — extracted from `src/entry/swastik.ts` so it has ONE implementation that
 * both the Swastik service and the app's own API can call. The caller keeps the request parsing and
 * the authorisation checks (developer approved, licence, ownership, compatibility ledger); this runs
 * everything after them: mint the buildId, stage the bundle, record the `builds` row, statically
 * verify, apply the promotion gate (ADR-006), sign the provenance, promote atomically under lock
 * carrying the sidecar, write the provenance back, and record the deployment.
 *
 * `deploy-module.test.ts` pins the composition this must preserve.
 */

/** How a deployment ended, for the `deployment_records` row. */
export type PromotionResult = 'promoted' | 'rolled-back' | 'not-attempted';

export interface DeployModuleInput {
  /** Already asserted safe by the caller (`assertSafeSlug`). */
  readonly moduleSlug: string;
  /** Already asserted safe by the caller (`assertSafeVersion`). */
  readonly version: string;
  readonly devId: string;
  /** The raw manifest as received (written verbatim to the staging dir). */
  readonly rawManifest: unknown;
  /** The parsed manifest (already validated by the caller). */
  readonly manifest: ModuleManifest;
  readonly indexSource: string;
  /**
   * The module's OWN files — `locales/`, `assets/` — as `{ relativePath: base64 }`, written into the
   * staging directory before verification so the promoted module carries them. This is not optional in
   * practice: `locales/en-US.json` is MANDATORY (spec §30) and Stage 11 fails without it, so a module
   * promoted without its locales is refused at load time and the bot refuses to start half-broken.
   */
  readonly files?: Readonly<Record<string, string>>;
  readonly humanApproved: boolean;
}

export interface DeployModuleDeps {
  readonly knex: Knex;
  readonly stagingVolume: string;
  readonly modulesDir: string;
  /** The promotion lock store (Redis-backed in production). */
  readonly lockStore: Parameters<typeof promoteUnderLock>[0]['lockStore'];
  /** `BUILD_SIGNING_KEY_ID`; empty disables signing (the loader then refuses the module). */
  readonly signingKeyId: string;
  /** `BUILD_SIGNING_PRIVATE_KEY` (single-line PEM). */
  readonly signingPrivateKey: string;
  readonly logger: Logger;
  readonly redact: (value: string) => string;
  readonly audit: (
    action: string,
    outcome: 'allowed' | 'rejected',
    detail: Record<string, unknown>,
  ) => Promise<void>;
  readonly recordDeployment: (input: {
    buildId: string;
    module: string;
    version: string;
    devId: string;
    promotionResult: PromotionResult;
  }) => Promise<void>;
}

export type DeployModuleResult =
  | {
      readonly ok: true;
      readonly buildId: string;
      readonly gate: string;
      readonly tier: string;
      readonly liveVolume: string;
      readonly manifest: unknown;
    }
  | { readonly ok: false; readonly code: number; readonly error: string };

function liveVolumeForTier(deps: DeployModuleDeps, tier: ModuleTier): string {
  const target = safeJoin(deps.modulesDir, TIER_VOLUME_NAMES[tier]);
  assertPathInside(deps.modulesDir, target);
  if (!existsSync(target)) mkdirSync(target, { recursive: true });
  return target;
}

/**
 * Write a module bundle into its staging directory: `manifest.json`, `index.js`, and the module's own
 * files (`locales/`, `assets/`) from `{ relativePath: base64 }`.
 *
 * §30 — the module's own files are not optional: `locales/en-US.json` is MANDATORY and Stage 11 fails
 * without it, so a bundle staged without its locales is promoted and then REFUSED at load time. Every
 * path is path-guarded, so a crafted relative path cannot escape the staging directory.
 */
export function stageModuleBundle(
  stagingDir: string,
  input: { rawManifest: unknown; indexSource: string; files?: Readonly<Record<string, string>> },
): void {
  if (!existsSync(stagingDir)) mkdirSync(stagingDir, { recursive: true });
  writeFileSync(
    join(stagingDir, 'manifest.json'),
    JSON.stringify(input.rawManifest, null, 2),
    'utf8',
  );
  writeFileSync(join(stagingDir, 'index.js'), input.indexSource, 'utf8');
  for (const [relativePath, base64] of Object.entries(input.files ?? {})) {
    if (typeof base64 !== 'string') continue;
    const target = safeJoin(stagingDir, relativePath);
    assertPathInside(stagingDir, target);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(base64, 'base64'));
  }
}

export async function deployModule(
  deps: DeployModuleDeps,
  input: DeployModuleInput,
): Promise<DeployModuleResult> {
  const { knex, logger, stagingVolume } = deps;
  const safeModuleSlug = input.moduleSlug;
  const safeModuleVersion = input.version;
  const providedDevId = input.devId;

  const buildId = `build_${randomBytes(12).toString('hex')}`;
  const stagingDir = safeJoin(stagingVolume, `${safeModuleSlug}__${safeModuleVersion}`);
  stageModuleBundle(stagingDir, input);

  await knex('builds').insert({
    buildId,
    devId: providedDevId,
    moduleSlug: safeModuleSlug,
    version: safeModuleVersion,
    validationStatus: 'pending',
  });

  const verification = verifyStagedBuild({
    stagingVolume,
    moduleSlug: safeModuleSlug,
    version: safeModuleVersion,
  });
  if (!verification.ok || verification.stagingDir === undefined) {
    await knex('builds')
      .where({ buildId })
      .update({ validationStatus: 'rejected', updatedAt: new Date() });
    await deps.audit('BUILD_LOAD_VERIFICATION_FAILED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      error: verification.reason ?? 'staged build failed static verification',
    });
    return {
      ok: false,
      code: 422,
      error: verification.reason ?? 'staged build failed static verification',
    };
  }

  const priorPromotion = await knex('builds')
    .where({ moduleSlug: safeModuleSlug })
    .whereNotNull('promotedAt')
    .first();
  const gate = decidePromotionGate({
    isFirstPromotion: priorPromotion === undefined,
    humanApproved: input.humanApproved,
  });
  if (!gate.allowed) {
    await deps.audit('BUILD_PROMOTION_REFUSED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      devId: deps.redact(providedDevId),
      error: gate.reason,
    });
    return { ok: false, code: 403, error: gate.reason };
  }

  let promotion: PromotionOutcome | null = null;
  try {
    const signed =
      deps.signingKeyId !== '' && deps.signingPrivateKey !== ''
        ? signProvenance({
            stagingDir: verification.stagingDir,
            moduleSlug: safeModuleSlug,
            version: safeModuleVersion,
            devId: providedDevId,
            buildId,
            keyId: deps.signingKeyId,
            privateKey: deps.signingPrivateKey,
          })
        : undefined;
    promotion = await promoteUnderLock({
      lockStore: deps.lockStore,
      liveVolume: liveVolumeForTier(deps, input.manifest.tier),
      stagingVolume,
      moduleSlug: safeModuleSlug,
      stagingDir: verification.stagingDir,
      ...(signed !== undefined ? { provenance: signed.sidecar } : {}),
    });
    if (signed !== undefined) {
      await new PostgresBuildStore(knex).setProvenance({
        buildId,
        moduleSlug: safeModuleSlug,
        version: safeModuleVersion,
        devId: providedDevId,
        sourceArchiveHash: signed.sourceArchiveHash,
        artifactHash: signed.artifactHash,
        lockfileHash: signed.lockfileHash,
        gateResultsHash: signed.gateResultsHash,
        sbom: null,
        signature: signed.sidecar.signature,
        signatureKeyId: signed.sidecar.signatureKeyId,
        signedDescriptor: signed.sidecar.signedDescriptor,
      });
    }
    await knex('builds')
      .where({ buildId })
      .update({ validationStatus: 'passed', promotedAt: new Date(), updatedAt: new Date() });
    logger.info('swastik-module-deployed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      gate: gate.gate,
      tier: input.manifest.tier,
      liveVolume: TIER_VOLUME_NAMES[input.manifest.tier],
    });
    await deps.audit('MODULE_DEPLOYED', 'allowed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      buildId,
      devId: deps.redact(providedDevId),
      gate: gate.gate,
      tier: input.manifest.tier,
    });
    await deps.recordDeployment({
      buildId,
      module: safeModuleSlug,
      version: safeModuleVersion,
      devId: providedDevId,
      promotionResult: 'promoted',
    });
    return {
      ok: true,
      buildId,
      gate: gate.gate,
      tier: input.manifest.tier,
      liveVolume: TIER_VOLUME_NAMES[input.manifest.tier],
      manifest: input.rawManifest,
    };
  } catch (err) {
    logger.error('swastik-deploy-failed', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      error: String(err),
    });
    await deps.audit('MODULE_DEPLOY_FAILED', 'rejected', {
      moduleSlug: safeModuleSlug,
      version: safeModuleVersion,
      error: String(err),
    });
    if (promotion !== null) {
      try {
        rollbackPromotion(promotion);
        await knex('builds')
          .where({ buildId })
          .update({ validationStatus: 'rejected', promotedAt: null, updatedAt: new Date() });
      } catch {
        /* rollback is best-effort */
      }
    }
    await deps.recordDeployment({
      buildId,
      module: safeModuleSlug,
      version: safeModuleVersion,
      devId: providedDevId,
      promotionResult: promotion !== null ? 'rolled-back' : 'not-attempted',
    });
    return { ok: false, code: 500, error: `deploy failed: ${(err as Error).message}` };
  }
}
