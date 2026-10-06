import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';
import { parseManifest } from './manifest.schema.js';
import { validateTierRules } from './tier-rules.js';
import { ModuleValidationFailedError } from './loader.js';
import type { LoadedModule } from './registry.js';
import type { ModuleTier } from './tier-rules.js';

export interface SwastikVolumeLoadResult {
  loaded: readonly string[];
  failed: readonly string[];
}

export interface SwastikVolumeLoaderOptions {
  modulesDir: string;
  registry: ModuleRegistry;
  logger: Logger;
}

const TIER_VOLUME_NAMES = {
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
  'swastik-staging',
] as const;

type ModuleVolumeName = (typeof MODULE_VOLUME_NAMES)[number];

function tierForVolume(volumeName: ModuleVolumeName): ModuleTier | null {
  for (const [tier, configuredVolumeName] of Object.entries(TIER_VOLUME_NAMES)) {
    if (configuredVolumeName === volumeName) return tier as ModuleTier;
  }
  return null;
}

export async function loadModulesFromTierVolumes(
  options: SwastikVolumeLoaderOptions,
): Promise<SwastikVolumeLoadResult> {
  const { modulesDir, registry, logger } = options;

  if (!existsSync(modulesDir)) {
    logger.warn('module-volume-root-missing', { modulesDir });
    return { loaded: [], failed: [] };
  }

  const loaded: string[] = [];
  const failed: string[] = [];

  for (const volumeName of MODULE_VOLUME_NAMES) {
    const volumePath = join(modulesDir, volumeName);
    if (!existsSync(volumePath)) {
      logger.warn('module-tier-volume-missing', { modulesDir, volumeName, volumePath });
      continue;
    }

    for (const entry of readdirSync(volumePath).sort()) {
      if (entry.startsWith('.') || entry.endsWith('__rollback') || entry.endsWith('__incoming'))
        continue;
      const entryPath = join(volumePath, entry);
      if (!existsSync(entryPath)) {
        logger.warn('module-skip-dangling', { module: entry, path: entryPath, volumeName });
        continue;
      }

      try {
        const moduleDir = resolve(entryPath);
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

        const indexPath = join(moduleDir, 'index.js');
        if (!existsSync(indexPath)) {
          throw new Error(`index.js is missing from live module "${entry}"`);
        }

        const pkg = (await import(pathToFileURL(indexPath).href)) as Partial<LoadedModule>;
        const loadedModule: LoadedModule = { manifest };
        if (pkg.onLoad) loadedModule.onLoad = pkg.onLoad;
        if (pkg.onReady) loadedModule.onReady = pkg.onReady;
        if (pkg.onUnload) loadedModule.onUnload = pkg.onUnload;
        registry.register(loadedModule);

        loaded.push(manifest.name);
        logger.info('module-volume-loaded', {
          module: manifest.name,
          version: manifest.version,
          tier: manifest.tier,
          volumeName,
          source: moduleDir,
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
