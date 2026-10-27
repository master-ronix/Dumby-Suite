/**
 * The STANDARD tier entrypoint — for a first-party feature module.
 *
 * POLICY (operator directive, 2026-10-27): a standard module is a feature, not part of the framework.
 * Its surface is the BASELINE only: it logs, reads its own config, caches its own values, measures
 * itself, translates its own strings, renders through the core renderer, asks the permission
 * resolver, and shares data on the global emit channel.
 *
 * It does NOT hold `data.sql`, `commands.registry`, `commands.router`, `events.bus`, `events.router`,
 * `process.schedule`, `process.queue`, `modules.registry`, `personas`, `admin.eval`, `auth.oauth2`,
 * `analytics.mtp` or `interactions.registry`. Those are listed in `coreOnlyCapabilities` and are
 * refused at runtime by the guarded container, so reaching for one fails during the module's own load
 * rather than quietly succeeding.
 *
 * Sharing with another module happens on the global data emit channel and nowhere else: no imports,
 * no direct calls, no subscribing to another module's internal events.
 */
export type { ModuleCommandManifest, ModuleManifest, SwastikModule } from '../manifest.js';
export { defineModule } from '../manifest.js';
export {
  baselineCapabilities,
  type GlobalDataDelivery,
  type GlobalDataEmit,
  type JsonValue,
  type ModuleCapability,
  type ModuleRuntime,
  type ModuleRuntimeExtras,
} from '../capabilities.js';
