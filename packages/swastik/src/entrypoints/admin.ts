/**
 * The ADMIN tier entrypoint — identical in surface to `core.ts`, and deliberately so.
 *
 * POLICY (operator directive, 2026-10-27): the admin tier is the operator's own tier. It holds the
 * same capabilities as core, plus the tier rules the manifest schema enforces (`devGuildOnly: true`).
 * It is not a wider surface than core: no tier reaches further than the internal core base.
 */
export type { ModuleCommandManifest, ModuleManifest, SwastikModule } from '../manifest.js';
export { defineModule } from '../manifest.js';
export {
  baselineCapabilities,
  coreOnlyCapabilities,
  moduleCapabilities,
  type GlobalDataDelivery,
  type GlobalDataEmit,
  type JsonValue,
  type ModuleCapability,
  type ModuleRuntime,
  type ModuleRuntimeExtras,
} from '../capabilities.js';
