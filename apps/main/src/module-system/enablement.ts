import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';
import { defaultEnabledForTier } from './tier-rules.js';
import type { ModuleTier } from './manifest.schema.js';

/**
 * UR-20261012-069 — the one place a module's per-guild standing is read for a GATE.
 *
 * §13.4/P13: `guild_module_states` is the single source of truth for whether a module is enabled in a
 * guild, and a per-guild row is an OVERRIDE on the tier default (a Standard module is enabled by
 * default, §13.2). Every gate — command dispatch, the event router, the queue, the scheduler — must
 * agree, or one surface denies what another allows. That agreement was maintained by hand in two
 * places; this module is the one place instead.
 *
 * These functions FAIL OPEN on a read error, deliberately: an unreadable state must not silently drop
 * live work. The command dispatch path is the exception and fails CLOSED, because refusing a command
 * is recoverable and running one for a disabled guild is not — that asymmetry is intentional.
 */
export interface EnablementDeps {
  /** A knex instance (the db handle's `.knex`). */
  knex: {
    (table: string): {
      where(cond: Record<string, unknown>): {
        whereNull(col: string): {
          first<T>(): Promise<T | undefined>;
          select<T>(...cols: string[]): Promise<T[]>;
        };
      };
    };
  };
  moduleRegistry: ModuleRegistry;
  logger: Logger;
}

export interface ModuleEnablement {
  /** Is `moduleId` enabled for `guildId`? A null guild (a DM) is never enabled. */
  isModuleEnabledForGuild(guildId: string | null, moduleId: string): Promise<boolean>;
  /**
   * Is `moduleId` wanted by ANY guild? Used for FLEET-WIDE work — a cron task is
   * `execute(): Promise<void>` with no guild, so a per-guild disable cannot address it; the faithful
   * reading of "the module's schedule stops" is that it runs while some guild wants the module.
   */
  isModuleEnabledAnywhere(moduleId: string): Promise<boolean>;
}

export function makeModuleEnablement(deps: EnablementDeps): ModuleEnablement {
  const { knex, moduleRegistry, logger } = deps;
  const tierOf = (moduleId: string): ModuleTier =>
    moduleRegistry.get(moduleId)?.manifest.tier ?? 'marketplace';

  const isModuleEnabledForGuild = async (
    guildId: string | null,
    moduleId: string,
  ): Promise<boolean> => {
    if (guildId === null) return false;
    const tier = tierOf(moduleId);
    // §13.2 — Core (and Admin) are loaded permanently and carry NO disable mechanism, so the row is
    // never consulted for one. The command router has always done this (UR-20261012-046); the event
    // gate did NOT, so a stale disabled row could silently drop a Core module's events while dispatch
    // allowed its commands. One read, one answer.
    if (tier === 'core' || tier === 'admin') return true;
    try {
      const row = await knex('guild_module_states')
        .where({ guildId, moduleSlug: moduleId })
        .whereNull('deletedAt')
        .first<{ enabled?: unknown; state?: unknown }>();
      // A per-guild row is an OVERRIDE; its ABSENCE means the tier default.
      if (row === undefined || row === null) return defaultEnabledForTier(tier);
      return row.enabled === true && row.state === 'active';
    } catch (err) {
      logger.warn('module-enabled-check-failed', { moduleId, guildId, error: String(err) });
      return defaultEnabledForTier(tier);
    }
  };

  const isModuleEnabledAnywhere = async (moduleId: string): Promise<boolean> => {
    const tier = tierOf(moduleId);
    // Admin and Core are loaded permanently and carry no disable mechanism (§13.2).
    if (tier === 'core' || tier === 'admin') return true;
    try {
      const rows = await knex('guild_module_states')
        .where({ moduleSlug: moduleId })
        .whereNull('deletedAt')
        .select<{ enabled?: unknown; state?: unknown }>('enabled', 'state');
      if (rows.length === 0) return defaultEnabledForTier(tier);
      return rows.some((row) => row.enabled === true && row.state === 'active');
    } catch (err) {
      logger.warn('module-enabled-anywhere-check-failed', { moduleId, error: String(err) });
      return defaultEnabledForTier(tier);
    }
  };

  return { isModuleEnabledForGuild, isModuleEnabledAnywhere };
}
