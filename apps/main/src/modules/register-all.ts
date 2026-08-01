import type { ModuleRegistry } from './registry.js';
import type { Logger } from '../logging/logger.js';
import { loadModulesFromSwastikVolume } from './swastik-loader.js';

/**
 * Stage 10 MODULE_DISCOVER: registers production modules from the Swastik
 * live volume. This intentionally contains no module-specific imports.
 */
export async function registerAllModules(
  registry: ModuleRegistry,
  logger: Logger,
  liveVolumePath: string,
): Promise<void> {
  await loadModulesFromSwastikVolume({ registry, logger, liveVolumePath });
}
