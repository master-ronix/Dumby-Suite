import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';
import { parseManifest } from './manifest.schema.js';
import { validateTierRules } from './tier-rules.js';
import { ModuleValidationFailedError } from './loader.js';
import type { LoadedModule } from './registry.js';
import type { ModuleTier } from './tier-rules.js';
import { assertPathInside, assertSafeSlug, assertSafeVersion } from '../shared/utils/path-guard.js';
import {
  hashFile,
  readBuildProvenanceSidecar,
  tupleFromSidecar,
  type BuildSignatureVerifier,
} from './build-signing.js';
import type { BuildProvenanceRecord, BuildStore } from '../db/repositories/build.repository.js';

export interface SwastikVolumeLoadResult {
  loaded: readonly string[];
  failed: readonly string[];
}

export interface SwastikVolumeLoaderOptions {
  modulesDir: string;
  registry: ModuleRegistry;
  logger: Logger;
  /**
   * §15.9 load-time verification (§15.8 provenance). When `buildStore` is supplied the loader checks
   * the on-disk artifact against its `builds` row before every import and refuses (quarantining the
   * directory) on a mismatch. UR-20261019-101: the loader TRUSTS the per-module buildId the deploy
   * flow issued — no `BUILD_SIGNING_*` key is required. `verifier` is accepted but no longer needed.
   */
  buildStore?: BuildStore;
  verifier?: BuildSignatureVerifier;
  /** Root for refused modules (§15.9 `quarantine/{buildId}/`). Defaults to `<modulesDir>/quarantine`. */
  quarantineDir?: string;
}

export const TIER_VOLUME_NAMES = {
  admin: 'modules-admin',
  core: 'modules-core',
  standard: 'modules-standard',
  marketplace: 'modules-marketplace',
} as const satisfies Record<ModuleTier, string>;

export const MODULE_VOLUME_NAMES = [
  TIER_VOLUME_NAMES.admin,
  TIER_VOLUME_NAMES.core,
  TIER_VOLUME_NAMES.standard,
  TIER_VOLUME_NAMES.marketplace,
] as const;

export const STAGING_VOLUME_NAME = 'swastik-staging';

type ModuleVolumeName = (typeof MODULE_VOLUME_NAMES)[number];

function tierForVolume(volumeName: ModuleVolumeName): ModuleTier | null {
  for (const [tier, configuredVolumeName] of Object.entries(TIER_VOLUME_NAMES)) {
    if (configuredVolumeName === volumeName) return tier as ModuleTier;
  }
  return null;
}

const PROMOTED_PATH_SEPARATOR = '__';

interface DiscoveredModuleName {
  readonly slug: string;
  readonly version: string | null;
}

function isTransientPromotionEntry(entry: string): boolean {
  return entry.endsWith('__rollback') || entry.endsWith('__incoming');
}

function parseDiscoveredModuleName(entry: string): DiscoveredModuleName | null {
  const separator = entry.indexOf(PROMOTED_PATH_SEPARATOR);
  const slugSegment = separator < 0 ? entry : entry.slice(0, separator);
  const versionSegment =
    separator < 0 ? null : entry.slice(separator + PROMOTED_PATH_SEPARATOR.length);
  try {
    const slug = assertSafeSlug(slugSegment);
    if (versionSegment === null) return { slug, version: null };
    return { slug, version: assertSafeVersion(versionSegment) };
  } catch {
    return null;
  }
}

/**
 * §15.9 cache-busting: the import specifier carries the buildId so the ESM loader cache cannot
 * serve a previous version's bytes across a hot swap. A stale-cache import becomes structurally
 * impossible rather than merely unlikely.
 */
export function cacheBustedImportUrl(indexPath: string, buildId: string | null): string {
  const href = pathToFileURL(indexPath).href;
  return buildId === null ? href : `${href}?b=${encodeURIComponent(buildId)}`;
}

export class ModuleProvenanceRefusedError extends Error {
  readonly module: string;
  readonly reason: string;

  constructor(module: string, reason: string) {
    super(`Refusing to import module "${module}": ${reason}`);
    this.name = 'ModuleProvenanceRefusedError';
    this.module = module;
    this.reason = reason;
  }
}

type ProvenanceVerdict =
  | { readonly ok: true; readonly buildId: string | null }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly buildId: string | null;
      readonly expectedArtifactHash: string | null;
      readonly actualArtifactHash: string | null;
    };

function missingProvenanceColumn(record: BuildProvenanceRecord): string | null {
  const required: readonly (keyof BuildProvenanceRecord)[] = [
    'sourceArchiveHash',
    'artifactHash',
    'lockfileHash',
    'gateResultsHash',
  ];
  for (const column of required) {
    if (record[column] === null) return String(column);
  }
  return null;
}

function verifyBuildProvenance(input: {
  readonly moduleDir: string;
  readonly indexPath: string;
  readonly buildStore: BuildStore;
  /** OPTIONAL signature layer (L2). When present, the signature is verified on top of the floor. */
  readonly verifier?: BuildSignatureVerifier;
}): Promise<ProvenanceVerdict> {
  const sidecar = readBuildProvenanceSidecar(input.moduleDir);
  if (sidecar === null) {
    // UR-20261019-103 — the signature layer (L2) is MANDATORY: a module with no provenance sidecar is
    // refused. Every build must be signed to load.
    return Promise.resolve({
      ok: false,
      reason: 'no build-provenance sidecar — a signed build is required to load',
      buildId: null,
      expectedArtifactHash: null,
      actualArtifactHash: null,
    });
  }
  return input.buildStore.findByBuildId(sidecar.buildId).then((record) => {
    if (record === undefined) {
      return {
        ok: false as const,
        reason: `no builds row for buildId "${sidecar.buildId}"`,
        buildId: sidecar.buildId,
        expectedArtifactHash: null,
        actualArtifactHash: null,
      };
    }
    const missing = missingProvenanceColumn(record);
    if (missing !== null) {
      return {
        ok: false as const,
        reason: `builds row "${sidecar.buildId}" is missing provenance column "${missing}"`,
        buildId: sidecar.buildId,
        expectedArtifactHash: record.artifactHash,
        actualArtifactHash: null,
      };
    }
    const actualArtifactHash = hashFile(input.indexPath);
    if (actualArtifactHash !== record.artifactHash) {
      return {
        ok: false as const,
        reason: 'on-disk artifact hash does not match the builds row',
        buildId: sidecar.buildId,
        expectedArtifactHash: record.artifactHash,
        actualArtifactHash,
      };
    }
    // UR-20261019-101 — a build an admin REVOKED (`validationStatus = 'rejected'`) is refused, so the
    // revoke route has a real effect on a specific (devId, buildId) identity.
    if (record.validationStatus === 'rejected') {
      return {
        ok: false as const,
        reason: `module build "${sidecar.buildId}" has been revoked (validationStatus=rejected)`,
        buildId: sidecar.buildId,
        expectedArtifactHash: record.artifactHash,
        actualArtifactHash,
      };
    }
    // The loader TRUSTS the per-module buildId the deploy flow issued (the `builds` row), instead of a
    // static BUILD_SIGNING_* key. The artifact hash above still ties the on-disk bytes to the row.
    // MANDATORY signature layer (L2). No armed verifier means the build cannot be verified, so the
    // module is refused; an invalid signature is refused. The hash floor (L1) above always runs too.
    if (input.verifier === undefined) {
      return {
        ok: false as const,
        reason: 'no signing verifier armed — the build signature cannot be verified',
        buildId: sidecar.buildId,
        expectedArtifactHash: record.artifactHash,
        actualArtifactHash,
      };
    }
    const signedOk = input.verifier.verifyTuple(tupleFromSidecar(sidecar), {
      signature: record.signature ?? '',
      signatureKeyId: record.signatureKeyId ?? '',
      signedDescriptor: record.signedDescriptor ?? '',
    });
    if (!signedOk) {
      return {
        ok: false as const,
        reason: 'Ed25519 signature does not cover the deployed artifact bytes',
        buildId: sidecar.buildId,
        expectedArtifactHash: record.artifactHash,
        actualArtifactHash,
      };
    }
    return { ok: true as const, buildId: sidecar.buildId };
  });
}

function quarantineModuleDir(input: {
  readonly moduleDir: string;
  readonly quarantineDir: string;
  readonly buildId: string | null;
  readonly entry: string;
  readonly logger: Logger;
}): string | null {
  const key = input.buildId ?? input.entry;
  const dest = join(input.quarantineDir, key);
  try {
    mkdirSync(input.quarantineDir, { recursive: true });
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    renameSync(input.moduleDir, dest);
    return dest;
  } catch (err) {
    input.logger.error('module-quarantine-failed', {
      module: input.entry,
      path: input.moduleDir,
      quarantineDir: input.quarantineDir,
      error: String(err),
    });
    return null;
  }
}

export async function loadModulesFromTierVolumes(
  options: SwastikVolumeLoaderOptions,
): Promise<SwastikVolumeLoadResult> {
  const { modulesDir, registry, logger } = options;

  if (!existsSync(modulesDir)) {
    logger.warn('module-volume-root-missing', { modulesDir });
    return { loaded: [], failed: [] };
  }

  const modulesRoot = realpathSync(modulesDir);
  const loaded: string[] = [];
  const failed: string[] = [];

  const { buildStore, verifier } = options;
  const guardActive = buildStore !== undefined;
  const quarantineDir = options.quarantineDir ?? join(modulesDir, 'quarantine');
  if (!guardActive) {
    const reason =
      'no buildStore supplied — modules are imported without §15.8/§15.9 load-time provenance verification';
    logger.warn(`module-provenance-unverified: ${reason}`, { modulesDir, reason });
  }

  for (const volumeName of MODULE_VOLUME_NAMES) {
    const volumePath = join(modulesDir, volumeName);
    if (!existsSync(volumePath)) {
      // A tier volume that is simply absent — a deployment that ships no external modules — is a
      // normal state, not a fault: lay down the (empty) directory and carry on. A real mount
      // overlays it, so this is a no-op wherever the volume is configured (e.g. K8s).
      mkdirSync(volumePath, { recursive: true });
      logger.info('module-tier-volume-empty', { modulesDir, volumeName, volumePath });
    }

    for (const entry of readdirSync(volumePath).sort()) {
      if (entry.startsWith('.') || isTransientPromotionEntry(entry)) continue;
      const entryPath = join(volumePath, entry);
      if (!existsSync(entryPath)) {
        logger.warn('module-skip-dangling', { module: entry, path: entryPath, volumeName });
        continue;
      }

      try {
        const discovered = parseDiscoveredModuleName(entry);
        if (discovered === null) {
          throw new ModuleValidationFailedError(entry, [
            `module directory name "${entry}" is neither a lowercase kebab-case module slug nor a "<slug>__<version>" promoted directory`,
          ]);
        }
        const moduleDir = realpathSync(entryPath);
        assertPathInside(modulesRoot, moduleDir);
        const manifestPath = join(moduleDir, 'manifest.json');
        if (!existsSync(manifestPath)) {
          throw new Error(`manifest.json is missing from module "${entry}"`);
        }

        let rawManifest: unknown;
        try {
          rawManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch (err) {
          throw new Error(`manifest.json for "${entry}" is not valid JSON: ${String(err)}`);
        }

        const manifest = parseManifest(rawManifest);
        if (manifest.name !== discovered.slug) {
          throw new ModuleValidationFailedError(discovered.slug, [
            `manifest name "${manifest.name}" does not match module directory "${discovered.slug}"`,
          ]);
        }
        if (discovered.version !== null && manifest.version !== discovered.version) {
          throw new ModuleValidationFailedError(discovered.slug, [
            `manifest version "${manifest.version}" does not match promoted directory version "${discovered.version}"`,
          ]);
        }
        const expectedTier = tierForVolume(volumeName);
        if (expectedTier !== null && manifest.tier !== expectedTier) {
          throw new ModuleValidationFailedError(manifest.name, [
            `tier-at-rest violation: manifest tier "${manifest.tier}" cannot load from ${volumeName}`,
          ]);
        }
        const violations = validateTierRules({
          name: manifest.name,
          tier: manifest.tier,
          devGuildOnly: manifest.devGuildOnly,
          marketplaceCategory: manifest.marketplaceCategory ?? null,
          commands: manifest.commands,
        });
        if (violations.length > 0) {
          throw new ModuleValidationFailedError(
            manifest.name,
            violations.map((v) => v.message),
          );
        }

        // §30 — `en-US.json` is mandatory; Stage 11 fails without it.
        if (!existsSync(join(moduleDir, 'locales', 'en-US.json'))) {
          throw new ModuleValidationFailedError(manifest.name, [
            'locales/en-US.json is mandatory (spec §30): Stage 11 fails without it',
          ]);
        }

        const indexPath = join(moduleDir, 'index.js');
        if (!existsSync(indexPath)) {
          throw new Error(`index.js is missing from live module "${entry}"`);
        }

        let buildId: string | null = null;
        if (guardActive) {
          const verdict = await verifyBuildProvenance({
            moduleDir,
            indexPath,
            buildStore,
            ...(verifier !== undefined ? { verifier } : {}),
          });
          if (!verdict.ok) {
            const quarantinedTo = quarantineModuleDir({
              moduleDir,
              quarantineDir,
              buildId: verdict.buildId,
              entry,
              logger,
            });
            logger.error('module-provenance-refused', {
              module: entry,
              volumeName,
              path: moduleDir,
              reason: verdict.reason,
              buildId: verdict.buildId,
              expectedArtifactHash: verdict.expectedArtifactHash,
              actualArtifactHash: verdict.actualArtifactHash,
              quarantinedTo,
            });
            throw new ModuleProvenanceRefusedError(entry, verdict.reason);
          }
          buildId = verdict.buildId;
        }

        const pkg = (await import(
          /* @vite-ignore */ cacheBustedImportUrl(indexPath, buildId)
        )) as Partial<LoadedModule>;
        const loadedModule: LoadedModule = { manifest };
        if (pkg.commands) loadedModule.commands = pkg.commands;
        if (pkg.jobs) loadedModule.jobs = pkg.jobs;
        if (pkg.events) loadedModule.events = pkg.events;
        if (pkg.tasks) loadedModule.tasks = pkg.tasks;
        if (pkg.onLoad) loadedModule.onLoad = pkg.onLoad;
        if (pkg.onReady) loadedModule.onReady = pkg.onReady;
        if (pkg.onUnload) loadedModule.onUnload = pkg.onUnload;
        // UR-20261012-066 — carry the module's directory, so the core can resolve an asset the
        // module declares in its own manifest instead of holding a copy of the path itself.
        registry.register({
          ...loadedModule,
          root: moduleDir,
          ...(buildId !== null ? { buildId } : {}),
        });

        loaded.push(manifest.name);
        logger.info('module-volume-loaded', {
          module: manifest.name,
          version: manifest.version,
          tier: manifest.tier,
          volumeName,
          source: moduleDir,
          buildId,
        });
      } catch (err) {
        failed.push(`${volumeName}/${entry}`);
        logger.error('module-volume-load-failed', {
          module: entry,
          volumeName,
          path: entryPath,
          error: String(err),
        });
      }
    }
  }

  if (failed.length > 0) {
    throw new Error(
      `Swastik volume discovery failed for ${failed.length} module(s): ${failed.join(', ')}. ` +
        'The deployment is incomplete or corrupted; refusing to start half-broken.',
    );
  }

  return { loaded, failed };
}

export const loadModulesFromSwastikVolume = loadModulesFromTierVolumes;
