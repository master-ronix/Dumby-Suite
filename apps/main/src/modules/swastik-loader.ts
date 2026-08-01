import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';
import { parseManifest } from './manifest.schema.js';
import { validateTierRules } from './tier-rules.js';
import { ModuleValidationFailedError } from './loader.js';
import type { LoadedModule } from './registry.js';

export interface SwastikVolumeLoadResult {
  loaded: readonly string[];
  failed: readonly string[];
}

export interface SwastikVolumeLoaderOptions {
  liveVolumePath: string;
  registry: ModuleRegistry;
  logger: Logger;
}

export async function loadModulesFromSwastikVolume(
  options: SwastikVolumeLoaderOptions,
): Promise<SwastikVolumeLoadResult> {
  const { liveVolumePath, registry, logger } = options;

  if (!existsSync(liveVolumePath)) {
    logger.warn('swastik-live-volume-missing', { liveVolumePath });
    return { loaded: [], failed: [] };
  }

  const loaded: string[] = [];
  const failed: string[] = [];

  for (const entry of readdirSync(liveVolumePath).sort()) {
    if (entry.startsWith('.') || entry.endsWith('__rollback')) continue;
    const entryPath = join(liveVolumePath, entry);
    if (!existsSync(entryPath)) {
      logger.warn('swastik-module-skip-dangling', { module: entry, path: entryPath });
      continue;
    }

    try {
      const moduleDir = resolve(entryPath);
      const manifestPath = join(moduleDir, 'manifest.json');
      if (!existsSync(manifestPath)) {
        throw new Error(`manifest.json is missing from live module "${entry}"`);
      }

      let rawManifest: unknown;
      try {
        rawManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch (err) {
        throw new Error(`manifest.json for "${entry}" is not valid JSON: ${String(err)}`);
      }

      const manifest = parseManifest(rawManifest);
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
      logger.info('swastik-module-loaded', {
        module: manifest.name,
        version: manifest.version,
        tier: manifest.tier,
        source: moduleDir,
      });
    } catch (err) {
      failed.push(entry);
      logger.error('swastik-module-load-failed', {
        module: entry,
        path: entryPath,
        error: String(err),
      });
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
