import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from './registry.js';

/**
 * The full chain that decides a module's standing for a profile in a guild.
 *
 * A module's availability is not one fact. It is the module's TIER, the guild's enable STATE row (and
 * the profile recorded as having enabled it), the profile BINDING that claims it, the resolved OWNER
 * that every surface is supposed to agree on, the module's BUILD state in the marketplace, and the
 * registration STATUS of the profile that ends up holding it. When they disagree — a module landing on
 * the wrong profile, a command answered by two profiles, a disable that appears not to take — the
 * disagreement is between those rows, and reading them one at a time from screenshots is guesswork.
 *
 * This module reads them together and returns them RAW. It decides nothing: it reports, so that the
 * decision can be seen rather than inferred. It lives here, beside `enablement.ts`, rather than in the
 * bootstrap, because it is read by a surface and a surface's data should be testable.
 */
export interface ModuleChainDeps {
  /** A knex instance (the db handle's `.knex`). */
  knex: {
    (table: string): {
      where(cond: Record<string, unknown>): {
        whereNull(col: string): {
          first<T>(): Promise<T | undefined>;
          select<T>(...cols: string[]): Promise<T[]>;
        };
        select<T>(...cols: string[]): Promise<T[]>;
      };
      select<T>(...cols: string[]): Promise<T[]>;
    };
  };
  moduleRegistry: ModuleRegistry;
  /** The ONE ownership read — the answer every surface is supposed to give. */
  resolveOwner: (guildId: string, moduleSlug: string) => Promise<string | undefined>;
  /**
   * Profile id → its registration status AND its application id. The application id is needed because
   * the instant command-permissions disable is a token per APPLICATION, not per profile.
   */
  listPersonaStatus: () => Promise<
    ReadonlyMap<string, { readonly status: string; readonly applicationId: string }>
  >;
  /**
   * Whether an application can hide a command INSTANTLY in this guild — i.e. a command-permission
   * token is stored for it. Absent, the field reads 'unknown' rather than guessing.
   */
  hasCommandPermissionToken?:
    ((applicationId: string, guildId: string) => Promise<boolean>) | undefined;
  logger: Logger;
}

/** The guild's own state row for a module. `null` means there is no row at all. */
export interface ModuleStateRow {
  readonly enabled: boolean;
  readonly state: string;
  readonly enabledBy: string | undefined;
}

/** A module's build in the marketplace, when it has one. */
export interface ModuleBuildRow {
  readonly buildId: string;
  readonly version: string;
  readonly validationStatus: string;
  readonly promotedAt: string | undefined;
}

/** One module's whole chain, raw. Nothing here is derived except `owner`, which is the shared read. */
export interface ModuleChainEntry {
  readonly moduleId: string;
  readonly displayName: string;
  readonly tier: string;
  readonly state: ModuleStateRow | null;
  readonly binding: { readonly personaId: string } | null;
  readonly owner: string;
  readonly build: ModuleBuildRow | null;
  /** The registration status of the profile that holds it, when the holder is a profile. */
  readonly ownerStatus: string | undefined;
  /**
   * Whether the holder can hide this module's commands INSTANTLY in this guild. 'n/a' for a shared
   * tier, 'unknown' when no reader is wired — so the answer is never silently assumed.
   */
  readonly commandPermissionToken: 'available' | 'missing' | 'n/a' | 'unknown';
}

export interface ModuleChain {
  /** Every module's chain for one guild, in registry order. */
  chainForGuild(guildId: string): Promise<readonly ModuleChainEntry[]>;
}

export function makeModuleChain(deps: ModuleChainDeps): ModuleChain {
  const {
    knex,
    moduleRegistry,
    resolveOwner,
    listPersonaStatus,
    hasCommandPermissionToken,
    logger,
  } = deps;

  const chainForGuild = async (guildId: string): Promise<readonly ModuleChainEntry[]> => {
    // One read per table, not one per module: a diagnostic that runs N queries per module is a
    // diagnostic nobody can afford to run while something is wrong.
    let states: Array<{
      moduleSlug?: unknown;
      enabled?: unknown;
      state?: unknown;
      enabledBy?: unknown;
    }> = [];
    let bindings: Array<{ moduleSlug?: unknown; personaId?: unknown }> = [];
    let builds: Array<{
      moduleSlug?: unknown;
      buildId?: unknown;
      version?: unknown;
      validationStatus?: unknown;
      promotedAt?: unknown;
    }> = [];
    let statuses: ReadonlyMap<string, { status: string; applicationId: string }> = new Map();

    try {
      states = await knex('guild_module_states')
        .where({ guildId })
        .whereNull('deletedAt')
        .select('moduleSlug', 'enabled', 'state', 'enabledBy');
    } catch (err) {
      logger.warn('module-chain-states-unavailable', { guildId, error: String(err) });
    }
    try {
      bindings = await knex('guild_persona_bindings')
        .where({ guildId })
        .whereNull('deletedAt')
        .select('moduleSlug', 'personaId');
    } catch (err) {
      logger.warn('module-chain-bindings-unavailable', { guildId, error: String(err) });
    }
    try {
      builds = await knex('builds').select(
        'moduleSlug',
        'buildId',
        'version',
        'validationStatus',
        'promotedAt',
      );
    } catch (err) {
      logger.warn('module-chain-builds-unavailable', { guildId, error: String(err) });
    }
    try {
      statuses = await listPersonaStatus();
    } catch (err) {
      logger.warn('module-chain-status-unavailable', { guildId, error: String(err) });
    }

    const stateOf = new Map<string, ModuleStateRow>();
    for (const row of states) {
      const slug = String(row.moduleSlug ?? '');
      if (slug === '') continue;
      stateOf.set(slug, {
        enabled: row.enabled === true,
        state: String(row.state ?? ''),
        enabledBy:
          typeof row.enabledBy === 'string' && row.enabledBy !== '' ? row.enabledBy : undefined,
      });
    }
    const bindingOf = new Map<string, string>();
    for (const row of bindings) {
      const slug = String(row.moduleSlug ?? '');
      const personaId = String(row.personaId ?? '');
      if (slug === '' || personaId === '') continue;
      bindingOf.set(slug, personaId);
    }
    const buildOf = new Map<string, ModuleBuildRow>();
    for (const row of builds) {
      const slug = String(row.moduleSlug ?? '');
      if (slug === '') continue;
      // The newest build wins: a module can have many, and the one that matters is the latest.
      buildOf.set(slug, {
        buildId: String(row.buildId ?? ''),
        version: String(row.version ?? ''),
        validationStatus: String(row.validationStatus ?? ''),
        promotedAt: typeof row.promotedAt === 'string' ? row.promotedAt : undefined,
      });
    }

    const entries: ModuleChainEntry[] = [];
    for (const module of moduleRegistry.all()) {
      const moduleId = module.manifest.name;
      const owner = (await resolveOwner(guildId, moduleId)) ?? 'main';
      const personaId = bindingOf.get(moduleId);
      // The instant disable is per APPLICATION and per GUILD, so the answer depends on who holds it.
      const holder = statuses.get(owner);
      let commandPermissionToken: ModuleChainEntry['commandPermissionToken'] = 'n/a';
      if (owner !== 'main' && owner !== 'shared') {
        commandPermissionToken =
          hasCommandPermissionToken === undefined || holder === undefined
            ? 'unknown'
            : (await hasCommandPermissionToken(holder.applicationId, guildId))
              ? 'available'
              : 'missing';
      } else if (owner === 'main' && hasCommandPermissionToken !== undefined) {
        commandPermissionToken = 'unknown';
      }
      entries.push({
        moduleId,
        displayName: module.manifest.ui?.displayName ?? moduleId,
        tier: module.manifest.tier,
        state: stateOf.get(moduleId) ?? null,
        binding: personaId === undefined ? null : { personaId },
        owner,
        build: buildOf.get(moduleId) ?? null,
        // Only meaningful when a PROFILE holds it: 'main' is not a row in the identity table.
        ownerStatus: holder?.status,
        commandPermissionToken,
      });
    }
    return entries;
  };

  return { chainForGuild };
}
