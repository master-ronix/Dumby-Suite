import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import type { PageRegistry } from '../module-system/page-registry.js';
import { makePageReadModel } from './page-read-model.js';
// The paging helpers now live in the package a module can import; re-exported here because the
// interaction handlers import them from this module.
export { modulePageNavigation, romanNumeral } from '@workspace/swastik';
import { defaultEnabledForTier } from '../module-system/tier-rules.js';
import { MAIN_PROFILE_ID, profileLabel } from '../personas/profile-label.js';
import { commandMarkerIcon, moduleIcon } from './module-icons.js';
import {
  resolveCommandStatuses,
  resolveEffectiveCommandNames,
} from '../commands/command-renames.js';

/**
 * The Discord surface /health reads, structurally. The host's discord.js client and a persona's
 * client slice both satisfy it, so one builder can report either.
 */
export interface HealthClient {
  isReady?(): boolean;
  ws?: { ping: number };
  guilds?: {
    cache: {
      size: number;
      reduce(fn: (sum: number, guild: { memberCount: number }) => number, init: number): number;
    };
    /** The AUTHORITY on membership; the cache is a snapshot taken at login and can lag. */
    fetch?(): Promise<unknown>;
  };
}

/** What the host knows about the runtime serving one application. */
export interface ActingProfile {
  readonly client?: HealthClient;
  /**
   * The module slugs she holds. The page filters the module registry by (core + these), because the
   * runtime's own registry is a COMMAND registry — a different shape that cannot report tiers.
   */
  readonly moduleSlugs?: readonly string[];
  /** When HER runtime came up. Absent for an application the host does not host. */
  readonly startedAt?: number;
}

export interface PageDataDeps {
  getClient: () => Client | undefined;
  /**
   * Q1-Q4 — the runtime serving an application: her client, her registry, her start time.
   *
   * /health is the PROFILE's health. Without this the page reported the host's client and the host's
   * registry, so both bots showed identical numbers — and a persona's page claimed the main bot's
   * gateway, modules and guild count.
   */
  actingProfile?: ((applicationId: string) => ActingProfile | undefined) | undefined;
  /**
   * The modules a profile HOLDS in a guild, by the SAME ownership read every other surface uses.
   *
   * A hosted profile's held set is its runtime's registry. The INTERNAL profile is not hosted here, so
   * its set came from nothing — /health reported zero standard-tier modules however many it held, and
   * installing one left the count at zero. This is the read that fixes it.
   */
  heldModulesInGuild?:
    | ((guildId: string, applicationId: string | undefined) => Promise<ReadonlySet<string>>)
    | undefined;
  /**
   * UR-20261012-029 — whether a bot is a member of a guild. A persona's active state is whether it
   * is actually present in its bound guild, which only the host can resolve. Absent, the page
   * reports a persona as inactive rather than guessing.
   */
  isMember?: ((guildId: string, applicationId: string) => Promise<boolean>) | undefined;
  /**
   * UR-20261012-031 — builds a persona's invite URL. Kept as a dependency so the page layer never
   * has to know the service's public origin or the install permission bitfield.
   */
  personaInvite?:
    ((input: { applicationId: string; guildId: string; withOAuth: boolean }) => string) | undefined;
  /**
   * UR-20261012-061 — WHICH PROFILE OWNS A MODULE in a guild. A standard/marketplace module belongs
   * to one profile per guild (first come); core belongs to nobody. Kept as a dependency so the page
   * layer never re-derives ownership from a second source.
   */
  resolveOwner?: ((guildId: string, moduleSlug: string) => Promise<string | undefined>) | undefined;
  moduleRegistry: ModuleRegistry;
  /**
   * UR-20261027-106 — pages a MODULE owns. Consulted before this file's own switch, so a module that
   * declares a page takes over its own surface and the host stops authoring it. Absent, every page
   * falls back to the built-in switch — which is what the tests of those pages rely on.
   */
  pages?: PageRegistry | undefined;
  db: DbClient;
  redis: Redis;
  config: ConfigService;
  logger: Logger;
}

type PageData = Readonly<Record<string, unknown>>;
/**
 * §1.7 — the host side of the page-data channel. A module cannot see the running system, so every
 * value a page reports about it is gathered here, at dispatch, and handed to the handler. Only
 * values that are actually reachable are reported: a group with no data is omitted rather than
 * filled with a placeholder, because an invented number on a health page is worse than a missing
 * one.
 */
/**
 * item 6 / item 17 — the /modules dial's options: one per LISTING PAGE, naming the page and the range
 * of modules on it.
 *
 * This surface pages the modules directly, so a member moves between page slides, not between module
 * pages — an option per module would offer targets that do not exist. The range is what makes the
 * label useful: "Page 3" alone says nothing about what is on it.
 */
/**
 * item 5 — a page position as a Roman numeral.
 *
 * A dial moves between POSITIONS, and `Slide II` says that where `Page 2` reads as a count. Additive
 * form throughout (IIII rather than IV) on purpose: it is unambiguous to read at a glance, and the
 * numerals are a label, not arithmetic.
 */
/** How many available modules the /browse MAIN view lists before Discover takes over. */
export const BROWSE_MAIN_LIMIT = 15;

export function createPageDataProvider(deps: PageDataDeps): (
  moduleId: string,
  guildId: string | null,
  page: number,
  query: string | undefined,
  // UR-20261012-075 — this signature is declared TWICE: here and on the router's dependency. They
  // drifted, and the drift is what let the primary render omit the acting profile while the
  // post-effect render passed it. Both are required now, in both places.
  applicationId: string,
  actingProfileId: string,
) => Promise<PageData> {
  const {
    getClient,
    actingProfile,
    moduleRegistry,
    db,
    redis,
    config,
    logger,
    isMember,
    personaInvite,
    resolveOwner,
  } = deps;

  /**
   * UR-20261011-011 — the guild's module enablement, read once. A module is "enabled" when its
   * `guild_module_states` row is `enabled:true, state:'active'`; an absent row falls back to the
   * tier default (`defaultEnabledForTier`). The disabled set drives what the catalogue lists, what
   * the installed list shows, and which module pages the dashboard registers.
   */
  const enabledStates = async (guildId?: string | null): Promise<Map<string, boolean>> => {
    const map = new Map<string, boolean>();
    if (!guildId) return map;
    try {
      const rows = await db
        .knex('guild_module_states')
        .where({ guildId })
        .whereNull('deletedAt')
        .select<{ moduleSlug: string; enabled: boolean; state: string }[]>(
          'moduleSlug',
          'enabled',
          'state',
        );
      for (const row of rows) {
        map.set(String(row.moduleSlug), row.enabled === true && row.state === 'active');
      }
    } catch (err) {
      logger.warn('page-data-module-states-unavailable', { guildId, error: String(err) });
    }
    return map;
  };

  /** Sum the member counts a cache holds. A guild with no readable count contributes nothing — never NaN. */
  function sumMembers(
    cache:
      | { reduce(fn: (sum: number, g: { memberCount: number }) => number, init: number): number }
      | undefined,
  ): number {
    if (cache === undefined) return 0;
    try {
      const total = cache.reduce(
        (sum, g) => sum + (typeof g.memberCount === 'number' ? g.memberCount : 0),
        0,
      );
      return Number.isFinite(total) ? total : 0;
    } catch {
      return 0;
    }
  }

  /**
   * UR-20261012-061 — the ONE ownership rule, read once per page.
   *
   *   * CORE is shared: owned by nobody, visible to every profile.
   *   * STANDARD / MARKETPLACE belong to ONE profile in the guild — whoever claimed it first.
   *
   * `ownedBy` is the only thing any page consults, so /persona, /modules, /browse and /dashboard can
   * no longer disagree about who holds a module.
   */
  /**
   * The holder of `slug` in `guildId`, read FRESH on every call.
   *
   * This used to memoise into a `Map` declared beside the provider, so the answer was frozen for the
   * life of the PROCESS: /browse kept naming whoever held a module when the page was first rendered,
   * long after an install, a disable or a move had changed it. Nothing ever invalidated that Map —
   * there was no invalidation to call. A read that must agree with /modules and /dashboard cannot be
   * cached across renders; within one render the callers already await in parallel, so the memo saved
   * very little and cost correctness.
   *
   * A FAILED read is logged rather than silently answering `undefined`. "The owner could not be read"
   * and "nobody holds it" are different facts, and conflating them is how /browse came to label an
   * unheld module "occupied by the main profile".
   */
  const holderOf = async (guildId: string | null, slug: string): Promise<string | undefined> => {
    if (guildId === null || resolveOwner === undefined) return undefined;
    try {
      return await resolveOwner(guildId, slug);
    } catch (err) {
      logger.warn('page-data-owner-read-failed', { guildId, slug, error: String(err) });
      return undefined;
    }
  };

  /** The registered NAME of a persona id, for anything a member reads. Undefined when unknown. */
  async function personaNameOf(personaId: string | undefined): Promise<string | undefined> {
    if (personaId === undefined || personaId === MAIN_PROFILE_ID) return undefined;
    try {
      // Read directly: the page layer has the knex handle, not the persona repository.
      const row = await db
        .knex('persona_identities')
        .where({ id: personaId })
        .first<{ name?: unknown }>();
      return typeof row?.name === 'string' && row.name !== '' ? row.name : undefined;
    } catch (err) {
      logger.warn('page-data-persona-name-unavailable', { personaId, reason: String(err) });
      return undefined;
    }
  }

  /** True when `actingProfileId` holds this module in this guild. Core is held by everyone. */
  /**
   * Does THIS profile hold the module?
   *
   * It used `holderOf` — the enabler column alone — and defaulted the answer to the INTERNAL profile
   * when there was none. The ownership resolver, which the install path and the deployer both use, says
   * 'nobody' for a disabled module. Two reads of one fact: a disabled module therefore read as the
   * internal profile's HERE while it read as unheld THERE, and that is the disagreement that had
   * /browse offering a module that /dashboard drew a page for.
   *
   * Now it asks the resolver. The resolver already answers 'main' for an enabled-but-unclaimed module,
   * so the default it used to hard-code is preserved where it was correct — and removed where it was
   * not, because undefined means NOBODY holds it.
   */
  const ownedBy = async (
    guildId: string | null,
    slug: string,
    tier: string,
    actingProfileId: string,
  ): Promise<boolean> => {
    if (tier === 'core') return true;
    // A DM has no module state, so nothing is guild-held there; the pages are the internal profile's,
    // which is what this read answered before and what a DM's dashboard still shows.
    if (guildId === null) return actingProfileId === MAIN_PROFILE_ID;
    if (resolveOwner === undefined) return false;
    const owner = await resolveOwner(guildId, slug);
    return owner !== undefined && owner === actingProfileId;
  };

  interface PersonaProfile {
    readonly id: string;
    readonly name: string;
    readonly isMain: boolean;
    readonly applicationId: string;
    readonly shards: string;
    readonly dmBehavior: string;
    readonly statusKind: string;
    readonly statusLabel: string;
    /** UR-20261012-031 — whether the persona's bot is actually in this guild. */
    readonly present: boolean;
    /** Whether an OAuth2 client secret is registered, so the invite can also authorize. */
    readonly hasOAuth: boolean;
    /** The invite URL for this persona ('' when it cannot be built). */
    readonly inviteUrl: string;
    readonly moduleCount: number;
    readonly commandCount: number;
  }

  /**
   * UR-20261012-026 — the /persona board. The page opens on the profile of the persona that is
   * actually running the command in this guild (the persona bound to this module, else the resident
   * main bot), lists every persona active in the guild for the switcher, and reports the commands
   * the selected profile owns. A failed persona read degrades to the main bot alone rather than
   * failing the page.
   */
  async function persona(
    moduleId: string,
    guildId: string | null,
    selected: string | undefined,
    applicationId: string,
  ): Promise<PageData> {
    const client = getClient();
    const online = client?.isReady() === true;
    const mainName = client?.user?.username ?? 'Main Bot';
    const mainAppId = client?.application?.id ?? '';
    const shards = String(config.get('SHARD_COUNT'));

    // The guild's persona bindings: (guildId, moduleSlug) -> personaId. A module bound to a persona
    // is owned by that persona in this guild; every other module belongs to the resident main bot.
    let bindings: Array<{ moduleSlug: string; personaId: string }> = [];
    let registered: Array<{
      id: string;
      name: string;
      discordApplicationId: string;
      boundGuildId: string;
      dmBehavior: string;
      shardAllocation: number;
      status: string;
      hasOAuth: boolean;
    }> = [];
    if (guildId !== null) {
      try {
        const rows = (await db
          .knex('guild_persona_bindings')
          .where({ guildId })
          .whereNull('deletedAt')) as ReadonlyArray<{ moduleSlug?: unknown; personaId?: unknown }>;
        bindings = rows
          .filter((row) => typeof row.moduleSlug === 'string' && typeof row.personaId === 'string')
          .map((row) => ({
            moduleSlug: row.moduleSlug as string,
            personaId: row.personaId as string,
          }));
        // UR-20261012-029 — a persona is listed when this guild registered it (`boundGuildId`) OR
        // when a binding points at it. A Twill registration is guild-bound, so the boundGuildId set
        // is exactly "the personas this guild registered".
        const personaIds = [...new Set(bindings.map((binding) => binding.personaId))];
        const personaRows = (await db
          .knex('persona_identities')
          .whereNull('deletedAt')
          .andWhere(
            (builder: {
              where: (column: string, value: string) => void;
              orWhereIn: (column: string, values: string[]) => void;
            }) => {
              builder.where('boundGuildId', guildId);
              if (personaIds.length > 0) builder.orWhereIn('id', personaIds);
            },
          )) as ReadonlyArray<Record<string, unknown>>;
        registered = personaRows
          .filter((row) => typeof row['id'] === 'string' && typeof row['name'] === 'string')
          .map((row) => ({
            id: row['id'] as string,
            name: row['name'] as string,
            discordApplicationId:
              typeof row['discordApplicationId'] === 'string' ? row['discordApplicationId'] : '',
            boundGuildId: typeof row['boundGuildId'] === 'string' ? row['boundGuildId'] : '',
            dmBehavior: typeof row['dmBehavior'] === 'string' ? row['dmBehavior'] : 'prohibited',
            shardAllocation:
              typeof row['shardAllocation'] === 'number' ? row['shardAllocation'] : 0,
            status: typeof row['status'] === 'string' ? row['status'] : 'active',
            // The sealed secret itself never leaves the data layer — only whether one exists.
            hasOAuth:
              row['oauthClientSecretSealed'] !== null &&
              row['oauthClientSecretSealed'] !== undefined,
            // UR-20261012-073 — whether this persona's OAuth leg has EVER completed. Discord exposes
            // no API to read an application's registered redirect URIs, so a successful exchange is
            // the only honest proof the redirect URL is configured. The page reports the FACT; the
            // persona module decides how to present it.
            oauthVerified: row['oauthVerifiedAt'] !== null && row['oauthVerifiedAt'] !== undefined,
          }));
      } catch (err) {
        logger.warn('page-data-persona-unavailable', { guildId, reason: String(err) });
      }
    }

    const ownerOf = new Map(bindings.map((binding) => [binding.moduleSlug, binding.personaId]));
    // UR-20261012-051 — the DEFAULT profile is the identity RUNNING the command, not a profile chosen
    // for the guild.
    //
    // The old chain was `ownerOf.get(moduleId) ?? guildRegistration?.id ?? MAIN_PROFILE_ID`: it asked
    // which persona owned the `persona` MODULE, then fell back to the persona registered for the
    // guild — so `/persona` run from the main bot opened on the PERSONA's profile instead of the main
    // bot's own. The operator reported exactly that.
    //
    // `PERSONA_ID` is the identity this process runs as: empty for the main bot, set for a dedicated
    // persona process. That is the question the page was always trying to answer.
    const residentPersonaId = config.get('PERSONA_ID');
    const currentProfileId =
      residentPersonaId !== '' && registered.some((entry) => entry.id === residentPersonaId)
        ? residentPersonaId
        : MAIN_PROFILE_ID;

    const allModules = moduleRegistry.all();
    // UR-20261012-054 — CLAIMED ownership, which is what the operator asked the page to show.
    //
    //   * CORE is never listed. A core module is shared without dispute (neither a persona nor the
    //     main bot "owns" it), so listing it under a profile is noise — and it made every profile look
    //     identical.
    //   * A persona's claim is its BINDING, and only its binding. A standard module the main bot
    //     already has enabled is the main bot's; a persona does not inherit it by existing.
    //   * The main bot's claim is a non-core module ENABLED for the guild that no persona has bound.
    //     The moment a persona binds one, it leaves the main bot's list.
    const enabledBySlugForClaims = await enabledStates(guildId);
    const claimedModulesFor = (profileId: string) =>
      allModules.filter((entry) => {
        const tier = entry.manifest.tier;
        if (tier === 'core' || tier === 'admin') return false;
        const slug = entry.manifest.name;
        if (profileId === MAIN_PROFILE_ID) {
          if (ownerOf.has(slug)) return false;
          return enabledBySlugForClaims.get(slug) ?? defaultEnabledForTier(tier);
        }
        return ownerOf.get(slug) === profileId;
      });

    const profileFor = (
      id: string,
      name: string,
      applicationId: string,
      isMain: boolean,
      dm: string,
      shard: string,
      statusKind: string,
      statusLabel: string,
      present: boolean,
      hasOAuth: boolean,
    ): PersonaProfile => {
      const owned = claimedModulesFor(id);
      return {
        id,
        name,
        isMain,
        applicationId,
        shards: shard,
        dmBehavior: dm,
        statusKind,
        statusLabel,
        present,
        hasOAuth,
        inviteUrl:
          isMain || guildId === null || personaInvite === undefined
            ? ''
            : personaInvite({ applicationId, guildId, withOAuth: hasOAuth }),
        moduleCount: owned.length,
        // UR-20261012-054 — the command inventory is gone from this page by request, so a command
        // COUNT is meaningless here too. Kept at zero rather than removed so the profile shape stays
        // stable for any other reader.
        commandCount: 0,
      };
    };

    const profiles: PersonaProfile[] = [
      profileFor(
        MAIN_PROFILE_ID,
        mainName,
        mainAppId,
        true,
        'Prohibited',
        shards,
        online ? 'online' : 'offline',
        online ? 'Online' : 'Offline',
        true,
        false,
      ),
      ...(await Promise.all(
        registered.map(async (entry) => {
          // UR-20261012-029 — a persona is ACTIVE only when its bot is invited and present in the
          // guild; a retired registration is retired regardless. Presence that cannot be resolved
          // is reported as inactive rather than assumed present.
          const present =
            isMember === undefined
              ? false
              : await isMember(guildId ?? '', entry.discordApplicationId);
          // UR-20261012-031 — a registered persona reads ONLINE (it exists and is invitable);
          // whether its bot is already in the guild is a separate, honest fact.
          const retired = entry.status !== 'active';
          return profileFor(
            entry.id,
            entry.name,
            entry.discordApplicationId,
            false,
            entry.dmBehavior === 'allowed' ? 'Allowed' : 'Prohibited',
            String(entry.shardAllocation),
            retired ? 'retired' : 'online',
            retired ? 'Retired' : 'Online',
            present,
            entry.hasOAuth,
          );
        }),
      )),
    ];

    const selectedId =
      selected !== undefined && profiles.some((profile) => profile.id === selected)
        ? selected
        : currentProfileId;
    const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
    const ownedModules = claimedModulesFor(selectedProfile?.id ?? MAIN_PROFILE_ID);

    // Only the tiers a profile can CLAIM. Core is absent by design.
    const tierOrder = ['standard', 'marketplace'] as const;
    const tiers = tierOrder
      .map((tier) => ({
        tier,
        modules: ownedModules
          .filter((entry) => entry.manifest.tier === tier)
          .map((entry) => ({
            name: entry.manifest.name,
            icon: moduleIcon(entry.manifest.ui?.icon, applicationId),
          })),
      }))
      .filter((group) => group.modules.length > 0);

    return {
      title: 'Active Personas',
      status: online ? 'online' : 'offline',
      currentProfileId,
      selectedProfileId: selectedProfile?.id ?? MAIN_PROFILE_ID,
      profiles,
      tiers,
      note: 'Persona creation and configuration are handled through the Twill registration API.',
    };
  }

  // item 6 — page 0 is the main dashboard (every core-tier module's commands, combined); page 1..n
  // is each STANDARD-tier module's own page. A core-tier module never gets its own page.
  // items 4/5/8 — every module command list carries the module icon asset beside it (the main page
  // and every module page alike), and a module page lists only that module's commands, under their
  // CURRENT (BCCM-effective) name and status.
  // items 1/5/6 — /browse is marketplace discovery. No in-content heading (the frame title already
  // names the surface — item 1). It lists the available, not-installed marketplace modules (item 5);
  // with a search query (item 5b) it lists only the name/description matches. The listing caps at
  // MARKETPLACE_MODULE_CAP (UR-20261011-006): one dropdown slot is reserved for the permanent Home
  // entry, so the listing and the install dropdown stay in sync within Discord's 25-option ceiling.
  /**
   * Q2/§13.2 — the tier default, adjusted for OWNERSHIP.
   *
   * A standard module is enabled by default — but not for a profile that did not get there first. The
   * guild's admin adds one bot first; its standard tiers are enabled by default, and a profile added
   * afterwards must NOT have them enabled by default, standard tier or not, because they are already
   * occupied. Core and Admin are shared and always on; marketplace never defaults on.
   */
  async function defaultEnabledForProfile(
    tier: string,
    slug: string,
    guildId: string | null,
    actingProfileId: string,
  ): Promise<boolean> {
    if (tier !== 'standard') return defaultEnabledForTier(tier as never);
    const holder = await holderOf(guildId, slug);
    // Nobody has claimed it: the resident main bot is the one that was there first. A persona is
    // only first if she claimed it, which she does by installing it.
    return holder === undefined ? actingProfileId === MAIN_PROFILE_ID : holder === actingProfileId;
  }

  // item 17 — /modules lists installed/enabled modules, one page at a time (UR-20261011-009). The
  // page renders as content blocks (a Section per module, each with an inline Info control); `lines`
  // remains for the condensed (M/C) fallback.

  return async (
    moduleId: string,
    guildId: string | null,
    // UR-20261012-075 — required-but-nullable rather than optional: a required parameter may not
    // follow an optional one, and these two must come before the two that are now required.
    page: number,
    query: string | undefined,
    // UR-20261012-057 — the application rendering the page. Its emoji ids are the only ones a message
    // from that application may reference.
    //
    // UR-20261012-075 — REQUIRED, with no default. UR-060 removed the default from the emoji READERS
    // for exactly this reason: a default meant a call site that forgot it silently borrowed the main
    // bot's scope, and the failure was visible only on a persona's page. The dispatcher kept its
    // default, so the same omission was still possible one level up.
    applicationId: string,
    // UR-20261012-061 — WHICH profile this page reports for. 'main' for the main bot, a persona id
    // for a persona. Every page scopes its modules by it.
    //
    // UR-20261012-075 — REQUIRED too, and this one was LIVE: the primary render at dispatch omitted
    // it, so a persona's FIRST page reported the main bot's modules, while the same page after an
    // effect (which did pass it) reported correctly. Two renders of one page disagreed.
    actingProfileId: string,
  ): Promise<PageData> => {
    // UR-20261027-106 — a module that owns its page answers first. The read-model is built from the
    // closures below, scoped to this request's guild and profile, so a module asks for a fact and
    // never receives a handle, a connection or a table name.
    // UR-20261027-106 — the facts a module page asks for that are not a table read.
    const probeSubsystems = async (): Promise<{
      database: 'connected' | 'unavailable';
      redis: 'connected' | 'unavailable';
    }> => {
      let database: 'connected' | 'unavailable' = 'unavailable';
      try {
        await db.knex.raw('select 1');
        database = 'connected';
      } catch (err) {
        // Unreachable is an answer, not an error: the page reports it rather than failing. It is still
        // worth a log line - the old host page emitted one here and losing it would make an outage
        // invisible to anything reading the logs rather than the page.
        logger.warn('page-data-db-unavailable', { error: String(err) });
      }
      let redisState: 'connected' | 'unavailable' = 'unavailable';
      try {
        await redis.ping();
        redisState = 'connected';
      } catch (err) {
        logger.warn('page-data-redis-unavailable', { error: String(err) });
      }
      return { database, redis: redisState };
    };
    const actingProfileFacts = () => {
      const acting = actingProfile?.(applicationId);
      const client = (acting?.client ?? getClient()) as
        { isReady?: () => boolean; ws?: { ping: number } } | undefined;
      return {
        profileId: actingProfileId,
        ...(acting?.startedAt !== undefined ? { startedAt: acting.startedAt } : {}),
        gatewayReady: client?.isReady?.() === true,
        ...(client?.ws !== undefined ? { gatewayPingMs: Math.round(client.ws.ping) } : {}),
        loadedModules: acting?.moduleSlugs ?? [],
      };
    };
    const heldModulesForPage = async (): Promise<readonly string[]> => {
      if (deps.heldModulesInGuild === undefined || guildId === null) return [];
      return [...(await deps.heldModulesInGuild(guildId, applicationId))];
    };
    const registered = deps.pages?.get(moduleId);
    if (registered !== undefined) {
      const read = makePageReadModel({
        // Mapped to the read-model's own shape rather than handing over the manifest: the registry's
        // entry is a union of per-tier manifest shapes, and a module has no business seeing the rest.
        // Mapped to the read-model's own shape, field by field. The registry's manifest is a union of
        // per-tier shapes with 20-odd fields; a module has no business seeing them, and handing the
        // union over does not satisfy the narrower contract anyway.
        listModules: () =>
          moduleRegistry.all().map((entry) => {
            const manifest = entry.manifest;
            const ui = manifest.ui;
            return {
              name: String(manifest.name),
              tier: String(manifest.tier),
              description: String(manifest.description),
              ...(manifest.devId !== undefined ? { devId: String(manifest.devId) } : {}),
              ...(ui !== undefined
                ? {
                    ui: {
                      ...(ui.displayName !== undefined ? { displayName: ui.displayName } : {}),
                      ...(ui.icon !== undefined ? { icon: ui.icon } : {}),
                      ...(ui.accent !== undefined ? { accent: ui.accent } : {}),
                    },
                  }
                : {}),
              commands: manifest.commands.map((command) => ({
                name: String(command.name),
                description: String(command.description),
              })),
            };
          }),
        isEnabled: async (slug) => (await enabledStates(guildId)).get(slug) ?? true,
        installedAt: async (slug) => {
          if (guildId === null) return undefined;
          const row = (await db
            .knex('guild_module_states')
            .select('createdAt')
            .where({ guildId, moduleSlug: slug })
            .whereNull('deletedAt')
            .first()) as unknown as { createdAt?: unknown } | undefined;
          const parsed = Date.parse(String(row?.createdAt));
          return Number.isNaN(parsed) ? undefined : parsed;
        },
        ownedByCaller: (slug) => ownedBy(guildId, slug, 'standard', actingProfileId),
        commandNames: () => resolveEffectiveCommandNames(db.knex, guildId),
        commandStatus: async (name) =>
          ((await resolveCommandStatuses(db.knex, guildId)).get(name) ?? 'enabled') as
            'enabled' | 'disabled',
        markerIcon: async () => commandMarkerIcon(applicationId),
        moduleIcon: (iconName) => moduleIcon(iconName, applicationId),
        probe: probeSubsystems,
        actingProfile: actingProfileFacts,
        heldModules: heldModulesForPage,
        shardCount: () => config.get('SHARD_COUNT'),
        holder: (slug) => holderOf(guildId, slug),
        guildState: async (slug) => (await enabledStates(guildId)).get(slug),
        tierDefault: async (slug) => {
          const entry = moduleRegistry.all().find((candidate) => candidate.manifest.name === slug);
          return entry === undefined ? false : defaultEnabledForTier(entry.manifest.tier);
        },
        profileLabel: async (profileId) =>
          profileLabel(
            profileId,
            profileId === MAIN_PROFILE_ID ? undefined : await personaNameOf(profileId),
          ),
        enabledByDefault: async (slug) => {
          const entry = moduleRegistry.all().find((candidate) => candidate.manifest.name === slug);
          if (entry === undefined) return false;
          return defaultEnabledForProfile(entry.manifest.tier, slug, guildId, actingProfileId);
        },
        pendingQueue: async () => {
          if (guildId === null) return [];
          try {
            const rows = (await db
              .knex('guild_command_queue')
              .where({ guildId, status: 'pending' })
              .whereNull('deletedAt')
              .orderBy('scheduledFor', 'asc')
              .select('commandKey', 'payload')) as unknown as {
              commandKey?: unknown;
              payload?: unknown;
            }[];
            return rows.map((row) => {
              const entry = (row.payload ?? {}) as Record<string, unknown>;
              return {
                commandKey: String(row.commandKey ?? ''),
                action: String(entry['action'] ?? 'rename'),
                ...(entry['newName'] !== undefined ? { newName: String(entry['newName']) } : {}),
                ...(entry['alias'] !== undefined ? { alias: String(entry['alias']) } : {}),
                ...(entry['disable'] !== undefined ? { disable: Boolean(entry['disable']) } : {}),
              };
            });
          } catch (err) {
            // An unreadable queue is reported as empty AND logged: the page says nothing is pending,
            // and the log is where the reason lives.
            logger.warn('page-data-queue-unavailable', { guildId, error: String(err) });
            return [];
          }
        },
        hostProcess: () => {
          const memory = process.memoryUsage();
          return {
            uptimeSeconds: process.uptime(),
            nodeVersion: process.version,
            memory: { rss: memory.rss, heapUsed: memory.heapUsed, heapTotal: memory.heapTotal },
          };
        },
        guilds: async () => {
          const acting = actingProfile?.(applicationId);
          const client = (acting?.client ?? getClient()) as
            | {
                guilds?: {
                  cache: { size: number };
                  fetch?: () => Promise<{ size?: unknown } | undefined>;
                };
              }
            | undefined;
          const cache = client?.guilds?.cache;
          const members = sumMembers(cache as never);
          let total = cache?.size ?? 0;
          let source: 'live' | 'cache' = 'cache';
          try {
            const fetched = await client?.guilds?.fetch?.();
            if (fetched !== undefined && typeof fetched.size === 'number') {
              total = fetched.size;
              source = 'live';
            }
          } catch (err) {
            logger.warn('page-data-guild-fetch-unavailable', { applicationId, error: String(err) });
          }
          const known = cache !== undefined && cache.size > 0;
          return { total, ...(known ? { members } : {}), source };
        },
      });
      const rendered = await registered.page.render(
        {
          guildId,
          applicationId,
          profileId: actingProfileId,
          page,
          ...(query !== undefined ? { query } : {}),
        },
        read,
      );
      return rendered as PageData;
    }
    switch (moduleId) {
      case 'persona':
        return persona(moduleId, guildId, query, applicationId);
      default:
        return {};
    }
  };
}
