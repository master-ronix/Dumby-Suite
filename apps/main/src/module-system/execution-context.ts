import { AsyncLocalStorage } from 'node:async_hooks';
import type {
  ExecutionIdentity,
  ModuleContextStore,
  ModuleEntryPoint,
  ModuleExecutionContext,
  ModuleStanding,
} from '@workspace/swastik';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';

/**
 * UR-20261012-070 — the process's own identity, as a fixed tuple.
 *
 * The router is built PER IDENTITY (UR-20261012-049): the main bot's router and a hosted persona's
 * router differ only in these four values. So this is not a per-invocation lookup — it is decided
 * once, at boot, and every entry point reuses it. Only the GUILD varies per invocation.
 */
export interface ProcessIdentity {
  /** `'main'`, or the persona's id. */
  readonly profileId: string;
  readonly kind: 'main' | 'persona';
  /** The Discord application this identity speaks as — the one that owns its emoji and commands. */
  readonly applicationId: string;
  readonly profileName: string;
  /** The ONE guild a persona serves; absent for the main bot. */
  readonly boundGuildId?: string;
}

export interface ModuleContextDeps {
  /**
   * Late-bound: the application id is read from the Discord client, which is not ready when the
   * loader registers a module's handlers at Stage 12.
   */
  identity: () => Promise<ProcessIdentity>;
  registry: ModuleRegistry;
  isModuleEnabledForGuild: (guildId: string, moduleId: string) => Promise<boolean>;
  resolveOwner: (guildId: string, moduleId: string) => Promise<string | undefined>;
  logger: Logger;
}

export type ModuleContextResolver = (
  moduleId: string,
  guildId: string | null,
  source: ModuleEntryPoint,
) => Promise<ModuleExecutionContext>;

/**
 * Build the context for one piece of module work.
 *
 * It NEVER throws, for the reason UR-20261012-068 settled: a context is ADVISORY. It tells a module
 * how to present itself; it does not decide whether the work runs (the gates do that). A fault here
 * therefore falls back to the conservative answer — an unreadable standing reports `enabled: false`
 * and `owner: 'main'`, never a confident wrong "yes" — rather than taking the work down with it.
 */
export function makeModuleContextResolver(deps: ModuleContextDeps): ModuleContextResolver {
  const { identity, registry, isModuleEnabledForGuild, resolveOwner, logger } = deps;

  return async (moduleId, guildId, source): Promise<ModuleExecutionContext> => {
    const process = await identity();
    const executionIdentity: ExecutionIdentity = {
      profileId: process.profileId,
      kind: process.kind,
      applicationId: process.applicationId,
      profileName: process.profileName,
      guildId,
      ...(process.boundGuildId !== undefined && process.boundGuildId !== ''
        ? { boundGuildId: process.boundGuildId }
        : {}),
    };

    const tier = registry.get(moduleId)?.manifest.tier ?? 'marketplace';
    const shared = tier === 'core' || tier === 'admin';

    let enabled: boolean;
    let owner: string;
    if (shared) {
      // §13.2 — Core and Admin are loaded permanently and carry no disable mechanism.
      enabled = true;
      owner = 'shared';
    } else if (guildId === null) {
      enabled = false;
      owner = 'main';
    } else {
      try {
        enabled = await isModuleEnabledForGuild(guildId, moduleId);
      } catch (err) {
        logger.warn(
          `module-context-enabled-unreadable module=${moduleId} guild=${guildId} reason=${String(err)}`,
        );
        enabled = false;
      }
      try {
        owner = (await resolveOwner(guildId, moduleId)) ?? 'main';
      } catch (err) {
        logger.warn(
          `module-context-owner-unreadable module=${moduleId} guild=${guildId} reason=${String(err)}`,
        );
        owner = 'main';
      }
    }

    const standing: ModuleStanding = {
      moduleId,
      tier,
      enabled,
      owner,
      ownedByCaller: shared || owner === executionIdentity.profileId,
    };

    return { moduleId, source, identity: executionIdentity, standing };
  };
}

/**
 * UR-20261012-070 — the app-side carrier. `AsyncLocalStorage` lives here rather than in the SDK,
 * because the SDK is deliberately environment-neutral (`"types": []`, no Node builtins). Installing
 * it is what makes `currentModuleContext()` work inside a module.
 */
export function createModuleContextStore(): ModuleContextStore {
  const storage = new AsyncLocalStorage<ModuleExecutionContext>();
  return {
    get: () => storage.getStore(),
    run: (context, fn) => storage.run(context, fn),
  };
}
