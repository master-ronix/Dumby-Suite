export type {
  ModuleCommandManifest,
  ModuleLifecycle,
  ModuleManifest,
  ModuleTier,
  SwastikModule,
} from './manifest.js';
export { defineModule, moduleTiers, moduleManifestSchema } from './manifest.js';
export { validateManifest } from './validate.js';
export type {
  CommandContext,
  ExecutionIdentity,
  ModuleStanding,
  CommandDeclaration,
  CommandHandler,
  CommandPageData,
  CommandPermissionsDeclaration,
  CommandRbacRequirement,
} from './commands.js';
export { defineCommand } from './commands.js';
export {
  assertCatalogCoversEvents,
  defineEvent,
  EventCatalogError,
  type EventCatalogEntry,
} from './events.js';
export type { ModuleEntryPoint, ModuleExecutionContext, ModuleContextStore } from './context.js';
export {
  currentModuleContext,
  installModuleContextStore,
  requireModuleContext,
  runWithModuleContext,
} from './context.js';
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
} from './capabilities.js';
