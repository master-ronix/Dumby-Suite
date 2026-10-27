import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';
import type { ModuleEnablement } from './enablement.js';

/**
 * MB-4 (UR-20261027-105) — the ONE standing read for module PROCESSES.
 *
 * A command, an event and a job already ask "is this module enabled here?" through four different
 * predicates that do not agree: command dispatch fails CLOSED per guild, the event router and the job
 * gate fail OPEN per guild, and a cron task asks a fleet-wide question ("does ANY guild want it?").
 * A process that a disabled module still owns is the gap the operator directive names.
 *
 * This module answers one question, once, for every process surface:
 *
 *   may this module run this piece of work, for this profile, in this guild — and who enabled it,
 *   and when?
 *
 * FAIL CLOSED, deliberately (operator decision, 2026-10-27). A skipped process is recoverable; work
 * done for a module the guild has disabled is not. That is the asymmetry `enablement.ts` already
 * documents for commands, applied to the process surfaces. An unreadable state row therefore answers
 * `allowed: false, reason: 'state-unreadable'` and is logged, never a confident "yes".
 */
export type ProcessStandingReason =
  'enabled' | 'core-tier' | 'not-enabled' | 'no-guild' | 'state-unreadable';

export interface ProcessStanding {
  readonly moduleId: string;
  readonly guildId: string | null;
  readonly profileId: string;
  readonly allowed: boolean;
  readonly reason: ProcessStandingReason;
  /** WHO enabled the module in this guild. Null when nobody does, or when the row predates the column. */
  readonly enabledBy: string | null;
  /** WHEN the row last changed — the closest the schema has to "when it was enabled". */
  readonly enabledAt: Date | null;
}

export interface ProcessScope {
  readonly moduleId: string;
  /** The guild the process serves; null for fleet-wide work (an explicit opt-in, never the default). */
  readonly guildId: string | null;
  readonly profileId: string;
}

export interface ProcessProvenanceRow {
  readonly enabledBy?: string | null;
  readonly updatedAt?: Date | string | null;
}

export interface ProcessStandingDeps {
  readonly enablement: ModuleEnablement;
  readonly moduleRegistry: ModuleRegistry;
  readonly logger: Logger;
  /** Reads the enabler and the row's last change. Absent, provenance answers null. */
  readonly readProvenance?: (
    guildId: string,
    moduleId: string,
  ) => Promise<ProcessProvenanceRow | undefined>;
}

export interface ProcessStandingReader {
  /** The standing for guild-scoped work. */
  forGuild(scope: ProcessScope): Promise<ProcessStanding>;
  /**
   * The standing for FLEET-WIDE work — a cron task that declares no guild. It runs while at least one
   * guild wants the module, which is the only faithful reading of "the module's schedule stops" for
   * work that carries no guild. Fleet-wide is an explicit opt-in, never a default.
   */
  forFleet(moduleId: string, profileId: string): Promise<ProcessStanding>;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function makeProcessStanding(deps: ProcessStandingDeps): ProcessStandingReader {
  const { enablement, moduleRegistry, logger, readProvenance } = deps;

  const tierOf = (moduleId: string): string =>
    moduleRegistry.get(moduleId)?.manifest.tier ?? 'marketplace';

  const provenance = async (
    guildId: string | null,
    moduleId: string,
  ): Promise<{ enabledBy: string | null; enabledAt: Date | null }> => {
    if (guildId === null || readProvenance === undefined) {
      return { enabledBy: null, enabledAt: null };
    }
    try {
      const row = await readProvenance(guildId, moduleId);
      if (row === undefined) return { enabledBy: null, enabledAt: null };
      return {
        enabledBy: typeof row.enabledBy === 'string' && row.enabledBy !== '' ? row.enabledBy : null,
        enabledAt: asDate(row.updatedAt),
      };
    } catch (err) {
      logger.warn('process-provenance-unreadable', { moduleId, guildId, error: String(err) });
      return { enabledBy: null, enabledAt: null };
    }
  };

  const forGuild = async (scope: ProcessScope): Promise<ProcessStanding> => {
    const { moduleId, guildId, profileId } = scope;
    const tier = tierOf(moduleId);
    // Core and Admin carry no disable mechanism (§13.2), so the row is never consulted for one.
    if (tier === 'core' || tier === 'admin') {
      const p = await provenance(guildId, moduleId);
      return { moduleId, guildId, profileId, allowed: true, reason: 'core-tier', ...p };
    }
    if (guildId === null) {
      // A guild-scoped process with no guild cannot be authorised; fleet-wide has its own read.
      return {
        moduleId,
        guildId,
        profileId,
        allowed: false,
        reason: 'no-guild',
        enabledBy: null,
        enabledAt: null,
      };
    }
    try {
      const allowed = await enablement.isModuleEnabledForGuild(guildId, moduleId);
      const p = await provenance(guildId, moduleId);
      return {
        moduleId,
        guildId,
        profileId,
        allowed,
        reason: allowed ? 'enabled' : 'not-enabled',
        ...p,
      };
    } catch (err) {
      logger.warn('process-standing-unreadable', { moduleId, guildId, error: String(err) });
      return {
        moduleId,
        guildId,
        profileId,
        allowed: false,
        reason: 'state-unreadable',
        enabledBy: null,
        enabledAt: null,
      };
    }
  };

  const forFleet = async (moduleId: string, profileId: string): Promise<ProcessStanding> => {
    const tier = tierOf(moduleId);
    if (tier === 'core' || tier === 'admin') {
      return {
        moduleId,
        guildId: null,
        profileId,
        allowed: true,
        reason: 'core-tier',
        enabledBy: null,
        enabledAt: null,
      };
    }
    try {
      const allowed = await enablement.isModuleEnabledAnywhere(moduleId);
      return {
        moduleId,
        guildId: null,
        profileId,
        allowed,
        reason: allowed ? 'enabled' : 'not-enabled',
        enabledBy: null,
        enabledAt: null,
      };
    } catch (err) {
      logger.warn('process-standing-unreadable', {
        moduleId,
        guildId: 'fleet',
        error: String(err),
      });
      return {
        moduleId,
        guildId: null,
        profileId,
        allowed: false,
        reason: 'state-unreadable',
        enabledBy: null,
        enabledAt: null,
      };
    }
  };

  return { forGuild, forFleet };
}
