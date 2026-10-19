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
  readonly loaded: readonly string[];
  readonly failed: readonly string[];
  /**
   * UR-20261018-093 — modules quarantined because their provenance could not be verified (§15.9).
   * A refused module is a deliberate, logged exclusion, not a half-broken boot.
   */
  readonly refused: readonly string[];
}

export interface SwastikVolumeLoaderOptions {
  modulesDir: string;
  registry: ModuleRegistry;
  logger: Logger;
  /**
   * §15.9 load-time verification (§15.8 provenance) — UR-20261018-093 / REC-025.
   *
   * Governance rule D-4.10 (`spec/governance/part-4-module-system-framework.md`) requires that,
   * *where the signing subsystem is not yet present, hash-bound provenance verification against the
   * build record is the enforced floor*. The guards are therefore SPLIT:
   *   - the HASH guard is active whenever a `buildStore` is supplied — it needs no key;
   *   - the SIGNATURE guard is additional, and active only when a `verifier` is supplied.
   * When NO `buildStore` is supplied the loader FAILS CLOSED: a module that cannot be hash-verified
   * is refused (quarantined) rather than imported unverified. Previously the two checks were gated
   * together on the signing key, so with no key the floor ran NOTHING (fail-open).
   */
  buildStore?: BuildStore;
  verifier?: BuildSignatureVerifier;
  /**
   * UR-20261018-093 — the image's baked-module build manifest (`<volume>/<slug>` -> expected
   * artifact hash), generated at image-build time by `stage-modules.mjs` and loaded from a
   * NON-MOUNTED path. A module with no `builds` row is accepted ONLY when its volume/slug is in this
   * manifest and its on-disk hash matches — the expected hash comes from the image, not the volume,
   * so a writable volume cannot forge it. Absent for a mounted-volume deployment (no baked modules).
   */
  bakedManifest?: Readonly<Record<string, string>>;
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
  | { readonly ok: true; readonly buildId: string }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly buildId: string | null;
      readonly expectedArtifactHash: string | null;
      readonly actualArtifactHash: string | null;
    };

/**
 * UR-20261018-093 — the columns the HASH floor needs (no key) versus the columns the SIGNATURE
 * layer additionally needs (a key). The hash floor is the D-4.10 minimum; it must be satisfiable
 * without a signing subsystem.
 */
const HASH_PROVENANCE_COLUMNS: readonly (keyof BuildProvenanceRecord)[] = [
  'sourceArchiveHash',
  'artifactHash',
  'lockfileHash',
  'gateResultsHash',
];

const SIGNATURE_PROVENANCE_COLUMNS: readonly (keyof BuildProvenanceRecord)[] = [
  'signature',
  'signatureKeyId',
  'signedDescriptor',
];

function missingProvenanceColumn(
  record: BuildProvenanceRecord,
  requireSignature: boolean,
): string | null {
  const required = requireSignature
    ? [...HASH_PROVENANCE_COLUMNS, ...SIGNATURE_PROVENANCE_COLUMNS]
    : HASH_PROVENANCE_COLUMNS;
  for (const column of required) {
    if (record[column] === null) return String(column);
  }
  return null;
}

/**
 * UR-20261018-093 (R1) — the hash check is decoupled from the signing key: the artifact hash is
 * always verified against the `builds` row when a store is present; the signature is verified only
 * when a `verifier` is supplied. `verifier` being absent no longer disables the floor.
 */
function verifyBuildProvenance(input: {
  readonly moduleDir: string;
  readonly indexPath: string;
  readonly buildStore: BuildStore;
  readonly verifier?: BuildSignatureVerifier;
  readonly bakedExpectedHash?: string;
}): Promise<ProvenanceVerdict> {
  const sidecar = readBuildProvenanceSidecar(input.moduleDir);
  if (sidecar === null) {
    return Promise.resolve({
      ok: false,
      reason: 'no build-provenance sidecar ties this directory to a builds row',
      buildId: null,
      expectedArtifactHash: null,
      actualArtifactHash: null,
    });
  }
  return input.buildStore.findByBuildId(sidecar.buildId).then((record) => {
    if (record === undefined) {
      // UR-20261018-093 — a BAKED module (packed into the image, no `builds` row) is verified
      // against the IMAGE's build manifest, never against a sidecar on the module's own directory:
      // the expected hash comes from a non-mounted image path, so a writable volume cannot forge
      // both the artifact and its proof, and a `baked` sidecar cannot downgrade a volume module.
      const expected = input.bakedExpectedHash;
      if (expected !== undefined) {
        const actual = hashFile(input.indexPath);
        if (actual === expected) {
          return { ok: true as const, buildId: sidecar.buildId };
        }
        return {
          ok: false as const,
          reason: 'baked artifact hash does not match the image build manifest',
          buildId: sidecar.buildId,
          expectedArtifactHash: expected,
          actualArtifactHash: actual,
        };
      }
      return {
        ok: false as const,
        reason: `no builds row for buildId "${sidecar.buildId}"`,
        buildId: sidecar.buildId,
        expectedArtifactHash: null,
        actualArtifactHash: null,
      };
    }
    const requireSignature = input.verifier !== undefined;
    const missing = missingProvenanceColumn(record, requireSignature);
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
    if (input.verifier !== undefined) {
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
    return { loaded: [], failed: [], refused: [] };
  }

  const modulesRoot = realpathSync(modulesDir);
  const loaded: string[] = [];
  const failed: string[] = [];
  const refused: string[] = [];

  const { buildStore, verifier, bakedManifest } = options;
  // UR-20261018-093 (R1/R2) — the guards are split. The hash floor is active whenever a build
  // store is present (no key needed); the signature layer is active only with a verifier.
  const hashGuardActive = buildStore !== undefined;
  const signatureGuardActive = verifier !== undefined;
  const quarantineDir = options.quarantineDir ?? join(modulesDir, 'quarantine');
  if (!hashGuardActive) {
    logger.error(
      'module-provenance-unverified: no buildStore supplied — every module will be refused ' +
        '(§15.9 fail-closed; the D-4.10 hash-bound floor cannot run)',
      { modulesDir },
    );
  } else if (!signatureGuardActive) {
    logger.info(
      'module-provenance-hash-only: signature guard disarmed (no verifier) — the D-4.10 hash-bound floor is enforced',
      { modulesDir },
    );
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
        if (hashGuardActive) {
          // UR-20261018-093 (R1) — the hash floor runs regardless of whether a verifier exists.
          const bakedExpectedHash = bakedManifest?.[`${volumeName}/${entry}`];
          const verdict = await verifyBuildProvenance({
            moduleDir,
            indexPath,
            buildStore,
            ...(signatureGuardActive ? { verifier } : {}),
            ...(bakedExpectedHash !== undefined ? { bakedExpectedHash } : {}),
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
        } else {
          // UR-20261018-093 (R2) — fail closed. Without a build store the D-4.10 floor cannot run,
          // so the module is quarantined rather than imported unverified (§15.9).
          const reason = 'no build store supplied — the D-4.10 hash-bound floor cannot run';
          const quarantinedTo = quarantineModuleDir({
            moduleDir,
            quarantineDir,
            buildId: null,
            entry,
            logger,
          });
          logger.error('module-provenance-refused', {
            module: entry,
            volumeName,
            path: moduleDir,
            reason,
            quarantinedTo,
          });
          throw new ModuleProvenanceRefusedError(entry, reason);
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
        registry.register({ ...loadedModule, root: moduleDir });

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
        if (err instanceof ModuleProvenanceRefusedError) {
          // §15.9 — a refused module is quarantined and the boot continues. It is a module that
          // could not prove its provenance, not a half-broken deployment.
          refused.push(`${volumeName}/${entry}`);
          continue;
        }
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

  return { loaded, failed, refused };
}

export const loadModulesFromSwastikVolume = loadModulesFromTierVolumes;
