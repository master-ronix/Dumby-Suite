import type { Container, Token } from '../di/container.js';
import { tokenName } from '../di/container.js';
import { CORE_TOKENS } from '../di/tokens.js';
import type { ModuleTier } from './manifest.schema.js';
import {
  baselineCapabilities,
  coreOnlyCapabilities,
  moduleCapabilities,
  type ModuleCapability,
  type ModuleRuntime,
} from '@workspace/swastik';
import type { GlobalDataEmit } from '@workspace/swastik';

/**
 * POLICY (operator directive, 2026-10-27) — the module boundary, enforced at load time.
 *
 * Before this file, `loader.ts` handed every module `onLoad(this.container)`: the whole DI container,
 * with all 22 core tokens on it. A Standard or Marketplace module could resolve `core.Db` (SQL, and
 * therefore every row the framework holds), `core.CommandRegistry` (every slash command registered to
 * any profile or guild), `core.Scheduler`, `core.Queue`, `core.EventBus` and `core.ModuleRegistry`,
 * exactly as a Core module can. The four tier entrypoints in `@workspace/swastik` were byte-identical,
 * so the tiers differed in name only.
 *
 * A module now receives a GUARDED container. Core and Admin hold every capability, because they are
 * specialised and optimised for the framework and the internal core base is their job. Standard and
 * Marketplace hold the baseline only: they log, read their own config, cache their own values, measure
 * themselves, translate their own strings, render through the core renderer, ask the permission
 * resolver, and share data on the global emit channel — and nothing else.
 *
 * The refusal is a THROW at the point of use, not a silent undefined, so a module that reaches for the
 * database fails loudly during its own load rather than quietly getting a half-working handle.
 */

export class ModuleCapabilityDeniedError extends Error {
  constructor(
    readonly moduleId: string,
    readonly tier: ModuleTier,
    readonly requested: string,
    readonly capability: ModuleCapability | null,
  ) {
    super(
      capability === null
        ? `Module "${moduleId}" (tier ${tier}) may not reach "${requested}": the internal core base ` +
            `is not part of any module's surface. Share data through the global data emit channel.`
        : `Module "${moduleId}" (tier ${tier}) may not use capability "${capability}" ` +
            `(requested "${requested}"). Only core and admin modules reach the internal core base; ` +
            `share data through the global data emit channel.`,
    );
    this.name = 'ModuleCapabilityDeniedError';
  }
}

/** Core and Admin are the two tiers that own the internal core base (§13.2, and the operator policy). */
export function isPrivilegedTier(tier: ModuleTier): boolean {
  return tier === 'core' || tier === 'admin';
}

/** The capabilities a tier holds. Core/Admin: all of them. Standard/Marketplace: the baseline. */
export function capabilitiesForTier(tier: ModuleTier): readonly ModuleCapability[] {
  return isPrivilegedTier(tier) ? moduleCapabilities : baselineCapabilities;
}

/**
 * The token → capability map. A core token not listed here is treated as UNREACHABLE by every tier,
 * which is the safe default: adding a token to `CORE_TOKENS` must not silently widen the module
 * surface. Module-namespaced tokens (`module.<slug>.<name>`) are handled separately.
 */
const TOKEN_CAPABILITIES: ReadonlyArray<readonly [Token<unknown>, ModuleCapability]> = [
  [CORE_TOKENS.Logger as Token<unknown>, 'logging'],
  [CORE_TOKENS.Config as Token<unknown>, 'config.read'],
  [CORE_TOKENS.Cache as Token<unknown>, 'cache'],
  [CORE_TOKENS.Metrics as Token<unknown>, 'metrics'],
  [CORE_TOKENS.I18n as Token<unknown>, 'i18n'],
  [CORE_TOKENS.Renderer as Token<unknown>, 'presentation.render'],
  [CORE_TOKENS.PermissionResolver as Token<unknown>, 'permissions.resolve'],

  [CORE_TOKENS.Db as Token<unknown>, 'data.sql'],
  [CORE_TOKENS.ModuleRegistry as Token<unknown>, 'modules.registry'],
  [CORE_TOKENS.CommandRegistry as Token<unknown>, 'commands.registry'],
  [CORE_TOKENS.CommandRouter as Token<unknown>, 'commands.router'],
  [CORE_TOKENS.CommandCeilingService as Token<unknown>, 'commands.ceiling'],
  [CORE_TOKENS.CollisionResolutionService as Token<unknown>, 'commands.collisions'],
  [CORE_TOKENS.EventBus as Token<unknown>, 'events.bus'],
  [CORE_TOKENS.EventRouter as Token<unknown>, 'events.router'],
  [CORE_TOKENS.Scheduler as Token<unknown>, 'process.schedule'],
  [CORE_TOKENS.Queue as Token<unknown>, 'process.queue'],
  [CORE_TOKENS.Personas as Token<unknown>, 'personas'],
  [CORE_TOKENS.AdminEvalGate as Token<unknown>, 'admin.eval'],
  [CORE_TOKENS.OAuth2 as Token<unknown>, 'auth.oauth2'],
  [CORE_TOKENS.MtpTokens as Token<unknown>, 'analytics.mtp'],
  [CORE_TOKENS.InteractionRegistry as Token<unknown>, 'interactions.registry'],
];

const CAPABILITY_OF_TOKEN = new Map<symbol, ModuleCapability>(
  TOKEN_CAPABILITIES.map(([token, capability]) => [token as symbol, capability]),
);

/** The capability a token needs, or null when the token is not reachable by any module. */
export function capabilityOfToken(token: Token<unknown>): ModuleCapability | null {
  return CAPABILITY_OF_TOKEN.get(token as symbol) ?? null;
}

/** `module.<slug>.<name>` — a token a module registers into its OWN namespace. */
const MODULE_TOKEN_PATTERN = /^module\.([a-z0-9][a-z0-9-]*)\./;

export interface ModuleGuardOptions {
  readonly moduleId: string;
  readonly tier: ModuleTier;
  readonly globalData: GlobalDataEmit;
}

/**
 * Wrap the container for one module. The returned object IS the container for every purpose a module
 * may have: `resolve`, `tryResolve`, `has` and `register` all work, inside the tier's surface, and
 * refuse outside it. Everything else on `Container` (freeze, createChild, createScope) is privileged:
 * a module that could freeze or fork the root container could reshape the framework for every other
 * module, which is the same boundary by another route.
 */
export function withModuleCapabilities(
  container: Container,
  options: ModuleGuardOptions,
): ModuleRuntime<Container> {
  const { moduleId, tier, globalData } = options;
  const granted = new Set<ModuleCapability>(capabilitiesForTier(tier));
  const privileged = isPrivilegedTier(tier);

  const allowed = (token: Token<unknown>): boolean => {
    const capability = capabilityOfToken(token);
    if (capability !== null) return granted.has(capability);
    // A module-namespaced token is the module's own; another module's namespace is not.
    const match = MODULE_TOKEN_PATTERN.exec(tokenName(token));
    if (match !== null) return match[1] === moduleId;
    // Unmapped: unreachable by every tier (see TOKEN_CAPABILITIES).
    return false;
  };

  const deny = (token: Token<unknown>): never => {
    throw new ModuleCapabilityDeniedError(
      moduleId,
      tier,
      tokenName(token),
      capabilityOfToken(token),
    );
  };

  const extras = {
    moduleId,
    tier: tier as string,
    capabilities: [...granted],
    globalData,
    hasCapability(capability: ModuleCapability): boolean {
      return granted.has(capability);
    },
  };

  const guarded = {
    resolve<T>(token: Token<T>): T {
      if (privileged || allowed(token as Token<unknown>)) return container.resolve(token);
      return deny(token as Token<unknown>);
    },
    tryResolve<T>(token: Token<T>): T | undefined {
      if (privileged || allowed(token as Token<unknown>)) return container.tryResolve(token);
      return deny(token as Token<unknown>);
    },
    has(token: Token<unknown>): boolean {
      // A question, not a reach: a denied token is simply not part of this module's surface.
      return allowed(token) && container.has(token);
    },
    register<T>(token: Token<T>, factory: Parameters<Container['register']>[1]): Container {
      if (privileged || allowed(token as Token<unknown>)) {
        return container.register(token, factory);
      }
      return deny(token as Token<unknown>);
    },
  };

  // A Proxy, not a copy: every other member (freeze, isFrozen, createChild, createScope) resolves
  // against the real container for a privileged tier, and is refused for the rest.
  return new Proxy(container as Container, {
    get(target, property) {
      if (typeof property === 'string' && property in guarded) {
        return (guarded as Record<string, unknown>)[property];
      }
      if (typeof property === 'string' && property in extras) {
        return (extras as Record<string, unknown>)[property];
      }
      const value = Reflect.get(target, property, target);
      if (typeof value !== 'function') return value;
      if (privileged) return value.bind(target);
      // Anything else on the container is privileged: refuse it rather than leak a bound method.
      return () => {
        throw new ModuleCapabilityDeniedError(
          moduleId,
          tier,
          `Container.${String(property)}`,
          null,
        );
      };
    },
    set(_target, property) {
      throw new ModuleCapabilityDeniedError(moduleId, tier, `Container.${String(property)}`, null);
    },
  }) as unknown as ModuleRuntime<Container>;
}

export { coreOnlyCapabilities, baselineCapabilities };
