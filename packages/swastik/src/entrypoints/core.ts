/**
 * The CORE tier entrypoint — for a module that owns part of the internal core base.
 *
 * POLICY (operator directive, 2026-10-27): core and admin modules are specialised and optimised for
 * the framework. They may reach the database, the command registry and router, the scheduler, the
 * queue, the internal event bus and router, personas, the admin eval gate, OAuth2, the MTP token
 * calculator and the interaction registry — because administering those surfaces IS their job.
 *
 * A standard or marketplace module must not import this file. The static half of that rule is
 * enforced by `packages/modules/eslint.config.mjs`; the runtime half by the guarded container the
 * loader hands every module, which refuses a capability its tier does not hold.
 */
export type {
  ModuleCommandManifest,
  ModuleManifest,
  SwastikModule,
} from "../manifest.js";
export { defineModule } from "../manifest.js";
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
} from "../capabilities.js";
