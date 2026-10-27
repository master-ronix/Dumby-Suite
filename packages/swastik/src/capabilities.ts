/**
 * The module capability surface — what a module is allowed to reach inside the core base.
 *
 * POLICY (operator directive, 2026-10-27): a module owner or developer must never be handed the
 * internal core base. Core and Admin modules are specialised and optimised for the framework and may
 * reach it; Standard and Marketplace modules may not — not the database, not the command registry,
 * not the scheduler, not the internal event bus.
 *
 * This file is the ONE list. `apps/main/src/module-system/module-capabilities.ts` enforces it at
 * load time by handing every module a guarded container, and `packages/modules/eslint.config.mjs`
 * enforces the static half by refusing cross-module and core-internal imports.
 *
 * Naming: a capability is a verb-shaped permission, never a token name, so the surface stays stable
 * when a token is renamed.
 */

/** Every capability the framework knows. A module's tier decides which of these it may hold. */
export const moduleCapabilities = [
  // --- baseline: every tier, because a module cannot present itself without these ---
  'logging',
  'config.read',
  'cache',
  'metrics',
  'i18n',
  'presentation.render',
  'permissions.resolve',
  'global.data.emit',

  // --- core/admin only: the internal core base ---
  'data.sql',
  'modules.registry',
  'commands.registry',
  'commands.router',
  'commands.ceiling',
  'commands.collisions',
  'events.bus',
  'events.router',
  'process.schedule',
  'process.queue',
  'process.workers',
  'personas',
  'admin.eval',
  'auth.oauth2',
  'analytics.mtp',
  'interactions.registry',
] as const;

export type ModuleCapability = (typeof moduleCapabilities)[number];

/**
 * The capabilities every tier holds. These are presentation and plumbing: they let a module log, read
 * its own config, cache its own values, measure itself, translate its own strings, render through the
 * core renderer, ask the permission resolver, and share data on the global emit channel.
 */
export const baselineCapabilities = [
  'logging',
  'config.read',
  'cache',
  'metrics',
  'i18n',
  'presentation.render',
  'permissions.resolve',
  'global.data.emit',
] as const satisfies readonly ModuleCapability[];

/**
 * The capabilities that reach the internal core base — SQL, the command registry and router, the
 * scheduler and queue, the internal event bus and router, personas, the admin eval gate, OAuth2, the
 * MTP token calculator and the interaction registry. Core and Admin hold all of them; Standard and
 * Marketplace hold none.
 */
export const coreOnlyCapabilities = moduleCapabilities.filter(
  (capability) => !(baselineCapabilities as readonly string[]).includes(capability),
) as readonly ModuleCapability[];

/**
 * The global data emit channel — the ONLY sanctioned way one module shares data with another.
 *
 * It carries data, never behaviour: a payload must be JSON, so no handle, function, class instance or
 * database client can travel through it. The channel is topic-namespaced and every delivery is
 * stamped with the emitting module, so a consumer knows the source and gets nothing else.
 *
 * A module can never subscribe to another module's internal events: the internal event bus is not a
 * capability any non-core tier holds. Isolation is therefore structural, not a convention.
 */
export interface GlobalDataEmit {
  /** Publish data on `topic`. The topic is namespaced and the delivery is stamped with this module. */
  emit(topic: string, payload: JsonValue): void;
  /** Subscribe to a topic. Returns the unsubscribe function. */
  on(topic: string, handler: (delivery: GlobalDataDelivery) => void): () => void;
}

export interface GlobalDataDelivery {
  /** The module that emitted this delivery. Stamped by the framework; never supplied by a caller. */
  readonly source: string;
  readonly topic: string;
  readonly payload: JsonValue;
}

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/**
 * What a module receives in place of the raw container. It IS the container, narrowed: the guard
 * intercepts `resolve`/`tryResolve`/`has`/`register` and refuses anything its tier does not hold.
 */
export interface ModuleRuntimeExtras {
  readonly moduleId: string;
  readonly tier: string;
  /** The capabilities this module actually holds — the tier's set, narrowed to what it may use. */
  readonly capabilities: readonly ModuleCapability[];
  readonly globalData: GlobalDataEmit;
  /** Does this module hold `capability`? (`has` itself stays the container's token query.) */
  hasCapability(capability: ModuleCapability): boolean;
}

export type ModuleRuntime<Container = unknown> = Container & ModuleRuntimeExtras;
