/**
 * UR-20261030-118 R1/R3 — the registry a module's PROVIDED services live in.
 *
 * A module's domain cannot move into the package while the core imports it statically at boot: that
 * inverts the plugin model. So the core declares a contract, the module provides an implementation at
 * load time, and the core resolves it **after** the load loop — never at import.
 *
 * This is deliberately an OBJECT the boot owns and injects, not a global. REC-039 records that the
 * framework has no service locator and should not grow one: a global would let any file reach any
 * module's implementation without its dependency being visible in a signature. A caller that needs a
 * module service takes this registry as a dependency, so the edge is in the type.
 */
import type { Container } from '../di/container.js';
import { tokenName } from '../di/container.js';

/** A service a module provides under a core-declared token. */
export interface ProvidedService {
  readonly token: symbol;
  /** The module that provides it — for the error a missing service raises. */
  readonly moduleId: string;
  readonly implementation: unknown;
}

/**
 * Raised when the core resolves a service no loaded module provides.
 *
 * A missing service is a STARTUP failure, not an `undefined` that surfaces three layers later as a
 * rendering bug: the message names the token and the modules that were loaded.
 */
export class ModuleServiceUnavailableError extends Error {
  constructor(
    readonly token: string,
    readonly loadedModules: readonly string[],
  ) {
    super(
      `Module service '${token}' is not provided by any loaded module (loaded: ${
        loadedModules.length === 0 ? 'none' : loadedModules.join(', ')
      })`,
    );
    this.name = 'ModuleServiceUnavailableError';
  }
}

export class ModuleServiceRegistry {
  private readonly services = new Map<string, ProvidedService>();

  /**
   * Records what a module provided during its load. The loader calls this after `onLoad`, so a service
   * exists only if the module's manifest declared it AND the module actually registered it.
   */
  provide(service: ProvidedService): void {
    this.services.set(tokenName(service.token), service);
  }

  /** The modules that provided a service, in load order. */
  providers(): readonly string[] {
    return [...this.services.values()].map((service) => service.moduleId);
  }

  /**
   * Resolves a provided service. Throws — visibly, naming the token — when no module provides it.
   *
   * R3: the caller gets a failure it can read, not an `undefined` it has to remember to check.
   */
  resolve<T>(token: symbol): T {
    const service = this.services.get(tokenName(token));
    if (service === undefined) {
      throw new ModuleServiceUnavailableError(tokenName(token), this.providers());
    }
    return service.implementation as T;
  }

  /** The same resolution for a caller that can degrade — a label, not a capability. */
  tryResolve<T>(token: symbol): T | undefined {
    return this.services.get(tokenName(token))?.implementation as T | undefined;
  }

  has(token: symbol): boolean {
    return this.services.has(tokenName(token));
  }
}

/**
 * The core-declared service contracts. A token here is a contract the core owns; a module's manifest
 * names it in `provides`, and the guard refuses a registration the manifest did not grant.
 */
export const MODULE_SERVICE_TOKENS = {
  /** The persona domain: what a profile is called, and which profiles a guild has. */
  PersonaDirectory: Symbol.for('core.PersonaDirectory'),
} as const;

/** The persona domain the core needs and does not own. */
export interface PersonaDirectoryService {
  /** What a profile is called in anything a member reads. */
  label(profileId: string | undefined, personaName?: string | undefined): string;
  /** The resident bot's profile id — the sentinel a persona id can never collide with. */
  readonly residentProfileId: string;
}

/** A container is not needed to resolve a provided service; the registry is the seam. */
export type ModuleServiceContainer = Container;
