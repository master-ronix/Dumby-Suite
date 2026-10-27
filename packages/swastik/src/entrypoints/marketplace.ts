/**
 * The MARKETPLACE tier entrypoint — for a third-party module.
 *
 * POLICY (operator directive, 2026-10-27): a marketplace module is a guest in the framework. Its
 * surface is the BASELINE only, exactly as a standard module's, and the internal core base is not
 * part of it. It cannot reach the database, the command registry, the scheduler, the queue, the
 * internal event bus or another module's code — and the framework refuses those at runtime rather
 * than trusting the module not to ask.
 *
 * Sharing with another module happens on the global data emit channel and nowhere else.
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
