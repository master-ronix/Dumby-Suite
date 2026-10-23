import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import { MARKETPLACE_MODULE_CAP, MODULES_PAGE_SIZE } from '../shared/constants/index.js';
import { defaultEnabledForTier } from '../module-system/tier-rules.js';
import { MAIN_PROFILE_ID, profileLabel } from '../personas/profile-label.js';
import { commandMarkerIcon, moduleIcon } from './module-icons.js';
import {
  effectiveCommandName,
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
  db: DbClient;
  redis: Redis;
  config: ConfigService;
  logger: Logger;
}

type PageData = Readonly<Record<string, unknown>>;
type Rows = ReadonlyArray<readonly [string, string]>;
interface Group {
  readonly name: string;
  readonly rows: Rows;
  /** UR-20261011-008 — the subsystem's health: 'ok' | 'warn' | 'down'. */
  readonly status?: string;
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

/** The display name for a module id: `hello-world` becomes `Hello World`. */
const titleCaseId = (id: string): string =>
  id
    .split(/[-_]/)
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');

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

export function romanNumeral(value: number): string {
  if (!Number.isFinite(value) || value < 1) return String(value);
  const table: Array<[number, string]> = [
    [1000, 'M'],
    [500, 'D'],
    [100, 'C'],
    [50, 'L'],
    [10, 'X'],
    [5, 'V'],
    [1, 'I'],
  ];
  let remaining = Math.floor(value);
  let out = '';
  for (const [size, glyph] of table) {
    while (remaining >= size) {
      out += glyph;
      remaining -= size;
    }
  }
  return out;
}

export function modulePageNavigation(
  pageTotal: number,
  total: number,
  pageSize: number,
): readonly {
  id: string;
  name: string;
  description: string;
  page: number;
}[] {
  // Page 0 is Home. The slides cover 1..pageTotal-1, numbered from I: numbering the first listing
  // page as a slide made Home and "Slide I" the same destination with the same modules on it, which
  // is the duplication reported twice.
  return Array.from({ length: Math.max(0, pageTotal - 1) }, (_, offset) => {
    const index = offset + 1;
    const first = index * pageSize + 1;
    const last = Math.min((index + 1) * pageSize, total);
    return {
      id: `page-${index + 1}`,
      name: `Slide ${romanNumeral(offset + 1)}`,
      description: first === last ? `Module ${first}` : `Modules ${first}–${last}`,
      page: index,
    };
  });
}

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

  async function health(applicationId: string): Promise<PageData> {
    // Q1-Q4 — the page is the ACTING profile's. Her client, her registry, her guilds, her uptime; the
    // host's own numbers are kept and LABELLED, because one process serves every profile and a
    // persona has no memory of her own to report.
    const acting = actingProfile?.(applicationId);
    const client = (acting?.client ?? getClient()) as HealthClient | undefined;
    const memory = process.memoryUsage();

    let dbStatus = 'Unavailable';
    try {
      await db.knex.raw('select 1');
      dbStatus = 'Connected';
    } catch (err) {
      logger.warn('page-data-db-unavailable', { error: String(err) });
    }
    let redisStatus = 'Unavailable';
    try {
      await redis.ping();
      redisStatus = 'Connected';
    } catch (err) {
      logger.warn('page-data-redis-unavailable', { error: String(err) });
    }

    // HER modules: the core set, which every profile shares, plus exactly the modules she holds.
    // Filtering the module registry rather than the command registry — only this one carries tiers.
    const modules = moduleRegistry
      .all()
      .filter(
        (entry) =>
          entry.manifest.tier === 'core' ||
          entry.manifest.tier === 'admin' ||
          acting?.moduleSlugs?.includes(entry.manifest.name) === true,
      );
    const byTier = (tier: string): number =>
      modules.filter((entry) => entry.manifest.tier === tier).length;

    const gatewayReady = client?.isReady?.() === true;
    const discordRows: Array<readonly [string, string]> = [];
    if (client?.ws !== undefined) {
      discordRows.push(['Gateway Ping', `${Math.round(client.ws.ping)}ms`]);
    }
    discordRows.push(['Gateway Status', gatewayReady ? 'Connected' : 'Disconnected']);
    discordRows.push(['Shard Count', String(config.get('SHARD_COUNT'))]);

    // UR-20261011-008 — each subsystem carries a status, so the health page can lead with an
    // at-a-glance overall state and mark a degraded subsystem in place.
    const groups: Group[] = [
      { name: 'Discord API', status: gatewayReady ? 'ok' : 'down', rows: discordRows },
      {
        // Q1 — SHARED, and named so. Memory, heap and the Node runtime belong to the one process that
        // serves every profile; a persona has none of her own, and reporting them as hers would be a
        // number that cannot mean what it says.
        name: 'Host Process (shared)',
        status: 'ok',
        rows: [
          ['Host Uptime', formatUptime(process.uptime())],
          ['Node.js Version', process.version],
          ['Memory Usage', mb(memory.rss)],
          ['Heap Used', mb(memory.heapUsed)],
          ['Heap Total', mb(memory.heapTotal)],
        ],
      },
      // Q4 — HER uptime, beside the host's, each labelled: a persona's runtime starts when she is
      // hosted, which is not when the process started.
      ...(acting?.startedAt !== undefined
        ? [
            {
              name: 'Profile Runtime',
              status: 'ok',
              rows: [['Uptime', formatUptime((Date.now() - acting.startedAt) / 1000)] as const],
            },
          ]
        : []),
      {
        name: 'Modules',
        status: 'ok',
        rows: [
          ['Total Loaded', String(modules.length)],
          ['Core-tier', String(byTier('core'))],
          ['Standard-tier', String(byTier('standard'))],
          ['Marketplace-tier', String(byTier('marketplace'))],
          ['Admin-tier', String(byTier('admin'))],
        ],
      },
      {
        name: 'Database',
        status: dbStatus === 'Connected' ? 'ok' : 'down',
        rows: [['PostgreSQL Status', dbStatus]],
      },
      {
        name: 'Cache',
        status: redisStatus === 'Connected' ? 'ok' : 'down',
        rows: [['Redis Status', redisStatus]],
      },
    ];

    if (client !== undefined) {
      // Q2 — FETCHED, not read from the cache. `guilds.cache.size` is a snapshot taken at login and
      // can lag real membership, which is how a bot in 3 guilds reported 4. The API is the authority;
      // the cache is the fallback for when the fetch fails, and the page says which it used.
      let guildCount = client.guilds?.cache.size ?? 0;
      let memberCount = client.guilds?.cache.reduce((sum, g) => sum + g.memberCount, 0) ?? 0;
      let source = 'cache';
      try {
        const fetched = (await client.guilds?.fetch?.()) as
          | {
              size?: number;
              reduce?: (
                fn: (sum: number, g: { memberCount: number }) => number,
                init: number,
              ) => number;
            }
          | undefined;
        if (fetched !== undefined && typeof fetched.size === 'number') {
          guildCount = fetched.size;
          if (typeof fetched.reduce === 'function') {
            memberCount = fetched.reduce((sum, g) => sum + g.memberCount, 0);
          }
          source = 'live';
        }
      } catch (err) {
        logger.warn('page-data-guild-fetch-unavailable', { applicationId, error: String(err) });
      }
      groups.push({
        name: 'Guilds & Users',
        status: 'ok',
        rows: [
          ['Total Guilds', String(guildCount)],
          ['Total Users', String(memberCount)],
          ['Source', source === 'live' ? 'Discord API' : 'Cached snapshot'],
        ],
      });
    }

    // The overall state is the worst subsystem: a critical subsystem (the Discord gateway or the
    // database) down is `down`; a non-critical one (the cache) down is `degraded`; else `operational`.
    const criticalDown = groups.some(
      (group) =>
        group.status === 'down' && (group.name === 'Discord API' || group.name === 'Database'),
    );
    const anyDown = groups.some((group) => group.status === 'down');
    const status = criticalDown ? 'down' : anyDown ? 'degraded' : 'operational';
    const statusLabel =
      status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Down';

    const summaryParts = [
      `up ${formatUptime(process.uptime())}`,
      `Node ${process.version}`,
      `${modules.length} modules`,
    ];
    if (client?.guilds !== undefined) summaryParts.push(`${client.guilds.cache.size} guilds`);

    return {
      title: 'System Health',
      status,
      statusLabel,
      summary: summaryParts.join(' · '),
      groups,
    };
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
  const ownerCache = new Map<string, string | undefined>();
  const holderOf = async (guildId: string | null, slug: string): Promise<string | undefined> => {
    if (guildId === null || resolveOwner === undefined) return undefined;
    const key = `${guildId}\u0000${slug}`;
    if (ownerCache.has(key)) return ownerCache.get(key);
    let owner: string | undefined;
    try {
      owner = await resolveOwner(guildId, slug);
    } catch {
      owner = undefined;
    }
    ownerCache.set(key, owner);
    return owner;
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
  const ownedBy = async (
    guildId: string | null,
    slug: string,
    tier: string,
    actingProfileId: string,
  ): Promise<boolean> => {
    if (tier === 'core') return true;
    return ((await holderOf(guildId, slug)) ?? MAIN_PROFILE_ID) === actingProfileId;
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

  async function queue(guildId: string | null): Promise<PageData> {
    let entries: readonly string[] = [];
    if (guildId !== null) {
      try {
        const rows = await db
          .knex('guild_command_queue')
          .where({ guildId, status: 'pending' })
          .whereNull('deletedAt')
          .orderBy('scheduledFor', 'asc')
          .select('commandKey', 'payload');
        entries = rows.map((row, index) => {
          const row2 = row as { commandKey?: unknown; payload?: unknown };
          const entry = (row2.payload ?? {}) as Record<string, unknown>;
          const parts = [`#${index + 1}`, `Action: ${String(entry['action'] ?? 'rename')}`];
          parts.push(`Command: ${String(row2.commandKey ?? '')}`);
          if (entry['newName'] !== undefined) parts.push(`New Name: ${String(entry['newName'])}`);
          if (entry['alias'] !== undefined) parts.push(`Alias: ${String(entry['alias'])}`);
          if (entry['disable'] !== undefined) parts.push(`Disable: ${String(entry['disable'])}`);
          parts.push('Status: Queued');
          return parts.join('   |   ');
        });
      } catch (err) {
        logger.warn('page-data-queue-unavailable', { guildId, error: String(err) });
      }
    }
    const pending = entries.length;
    return {
      title: 'Pending Command Queue Actions',
      groups: [
        {
          name: 'Batch',
          rows: [
            ['Window', 'changes are batched and pushed within the 12–13 hour window (§15.8)'],
            ['Total queued', String(pending)],
            ['Next batch push', 'within 12–13h'],
          ],
        },
      ],
      lines: pending === 0 ? ['No pending queue actions.'] : entries,
    };
  }

  async function permit(applicationId: string): Promise<PageData> {
    const lines: string[] = ['Choose a module command to manage grant access:', ''];
    for (const entry of moduleRegistry.all()) {
      const icon = moduleIcon(entry.manifest.ui?.icon, applicationId);
      for (const command of entry.manifest.commands) {
        lines.push(`${icon} /${command.name}   ${entry.manifest.name} — ${command.description}`);
      }
    }
    lines.push(
      '',
      '§8.4 — grants resolve role > group > set, most-specific-wins, and never override Layers 1–3,',
      'the bot-capability check, or the RESTRICTED floor. Layer 6 ranks are evaluated, never written.',
    );
    return { title: 'Grant Access — Step 1: Select Command', lines };
  }

  // item 6 — page 0 is the main dashboard (every core-tier module's commands, combined); page 1..n
  // is each STANDARD-tier module's own page. A core-tier module never gets its own page.
  // items 4/5/8 — every module command list carries the module icon asset beside it (the main page
  // and every module page alike), and a module page lists only that module's commands, under their
  // CURRENT (BCCM-effective) name and status.
  async function dashboard(
    page: number,
    guildId: string | null,
    applicationId: string,
    actingProfileId: string,
  ): Promise<PageData> {
    const all = moduleRegistry.all();
    // UR-20261011-011 — a disabled standard module has NO page on the dashboard (its commands are
    // not registered for the guild either, §17.6).
    const enabledBySlug = await enabledStates(guildId);
    // UR-20261012-061 — only the standard modules THIS profile holds.
    const dashboardEntries = await Promise.all(
      all
        .filter((entry) => entry.manifest.tier === 'standard')
        .map(async (entry) => ({
          entry,
          mine: await ownedBy(guildId, entry.manifest.name, 'standard', actingProfileId),
        })),
    );
    // item 6 — the DIAL's serial order: a module page is ordered by WHEN THE MODULE WAS INSTALLED in
    // this guild, so a module keeps its place as others come and go. `guild_module_states.createdAt`
    // is that moment; a module with no row (never explicitly installed) sorts last, deterministically.
    const installedAt = new Map<string, number>();
    if (guildId !== null) {
      const rows = (await db
        .knex('guild_module_states')
        .select('moduleSlug', 'createdAt')
        .where({ guildId })
        .whereNull('deletedAt')) as unknown as { moduleSlug: string; createdAt: unknown }[];
      for (const row of rows) {
        const parsed = Date.parse(String(row.createdAt));
        installedAt.set(row.moduleSlug, Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed);
      }
    }
    const installRank = (slug: string): number => installedAt.get(slug) ?? Number.MAX_SAFE_INTEGER;

    const standard = dashboardEntries
      .filter((r) => r.mine && (enabledBySlug.get(r.entry.manifest.name) ?? true))
      .map((r) => r.entry)
      .sort((a, b) => installRank(a.manifest.name) - installRank(b.manifest.name));
    const pageTotal = 1 + standard.length;

    // item 6 — the navigation entries, in that same order: one per module page, carrying the module's
    // declared logo NAME (the router resolves it for the acting application) so the option can show
    // the module's own icon, and the module's description verbatim.
    const navigation = standard.map((entry, index) => ({
      id: entry.manifest.name,
      name: entry.manifest.ui?.displayName ?? titleCaseId(entry.manifest.name),
      description: entry.manifest.description,
      page: index + 1,
      ...(entry.manifest.ui?.icon !== undefined ? { iconName: entry.manifest.ui.icon } : {}),
      // The module's OWN accent, when it declares one: the module's page then renders in it, and
      // falls back to the acting profile's accent (a persona's, or the neutral gray) when it does not.
      ...(entry.manifest.ui?.accent !== undefined ? { accent: entry.manifest.ui.accent } : {}),
    }));

    if (page >= 1 && page <= standard.length) {
      const entry = standard[page - 1];
      if (entry !== undefined) {
        const effective = await resolveEffectiveCommandNames(db.knex, guildId);
        const statuses = await resolveCommandStatuses(db.knex, guildId);
        // UR-20261011-009 — a module page's command list carries the squared marker (`dumby_modules`,
        // the modules module's grid), NOT the module-logo fallback (`dumby_module`, a cube). The list
        // reads as "this module's commands".
        const icon = commandMarkerIcon(applicationId);
        const lines = entry.manifest.commands.map((command) => {
          const current = effectiveCommandName(effective, command.name);
          const status = statuses.get(command.name) ?? 'enabled';
          const suffix = status === 'disabled' ? '  · disabled' : '';
          return `${icon} \`/${current}\`${suffix}`;
        });
        // item 7 — the page names its owning module, so the frame carries THAT module's banner,
        // footer and identity (the hello-world page shows the default banner, not the dashboard's).
        return {
          lines,
          pageTotal,
          page,
          navigation,
          pageModuleId: entry.manifest.name,
          pageModuleName: entry.manifest.ui?.displayName ?? titleCaseId(entry.manifest.name),
        };
      }
    }

    // item 6 - the main page combines every CORE-tier module's commands, each with its module icon.
    const lines: string[] = [];
    for (const entry of all) {
      if (entry.manifest.tier !== 'core') continue;
      const icon = moduleIcon(entry.manifest.ui?.icon, applicationId);
      for (const command of entry.manifest.commands) {
        lines.push(`${icon} \`/${command.name}\``);
      }
    }
    return { lines, pageTotal, page: 0, navigation };
  }

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

  async function marketplace(
    query: string | undefined,
    guildId: string | null,
    applicationId: string,
    actingProfileId: string,
  ): Promise<PageData> {
    const all = moduleRegistry.all();
    // UR-20261011-010/011 — the catalogue lists what a guild can INSTALL or RE-ENABLE: marketplace
    // modules not enabled for the guild, and standard modules the guild has disabled
    // ("Previously Installed", §13.2). Core/Admin are never listed.
    const enabledBySlug = await enabledStates(guildId);
    // UR-20261012-061 — the catalogue shows what THIS profile may install, PLUS what another profile
    // holds (marked as occupied, so the operator is told rather than shown a control that refuses).
    const candidates = all.filter((entry) => {
      const tier = entry.manifest.tier;
      return tier === 'marketplace' || tier === 'standard';
    });
    const ownedFlags = await Promise.all(
      candidates.map((entry) =>
        ownedBy(guildId, entry.manifest.name, entry.manifest.tier, actingProfileId),
      ),
    );
    // Resolve the ownership-aware defaults BEFORE filtering: the predicate is synchronous, and the
    // standard tier's default now depends on who holds the module.
    const tierDefault = await Promise.all(
      candidates.map((entry) =>
        defaultEnabledForProfile(
          entry.manifest.tier,
          entry.manifest.name,
          guildId,
          actingProfileId,
        ),
      ),
    );
    const available = candidates.filter((entry, i) => {
      const slug = entry.manifest.name;
      const enabled = enabledBySlug.get(slug) ?? tierDefault[i] === true;
      if (!enabled) return true; // installable, or re-enableable
      // Enabled: offer it only when this profile does NOT hold it — i.e. when it is occupied.
      return ownedFlags[i] !== true;
    });
    // item 5b — the Discover search matches what a member can actually type: the module's NAME (its
    // id — the only handle a build publishes), its DISPLAY name, its developer, and its description.
    const q = (query ?? '').trim().toLowerCase();
    const matched =
      q === ''
        ? available
        : available.filter((entry) =>
            [
              entry.manifest.name,
              entry.manifest.ui?.displayName ?? '',
              entry.manifest.devId,
              entry.manifest.description,
            ]
              .join(' ')
              .toLowerCase()
              .includes(q),
          );
    // The main view is a SHORT list of what is available — the rest is what Discover is for.
    const shown = matched.slice(0, q === '' ? BROWSE_MAIN_LIMIT : MARKETPLACE_MODULE_CAP);
    const modules = await Promise.all(
      shown.map(async (entry) => {
        const slug = entry.manifest.name;
        const tier = entry.manifest.tier;
        const holder = await holderOf(guildId, slug);
        // UR-20261012-079 — `holder === undefined` used to be the proxy for "the main bot", because
        // an enabled-but-unbound module answered undefined. UR-078 made that read answer `'main'`
        // explicitly, so the proxy inverted: a module the MAIN BOT enabled started reading as
        // "Occupied by a persona — the main bot cannot take it", which is nonsense. Both spellings
        // mean the main bot.
        const heldByMain = holder === undefined || holder === MAIN_PROFILE_ID;
        // Occupied: held by ANOTHER profile AND live for the guild. Two different questions, and they
        // must not be conflated:
        //   * `enabled` (above) is the PER-PROFILE default — it decides whether this profile is offered
        //     the module at all, and ownership makes it false for a module someone else holds.
        //   * `guildEnabled` is the GUILD's own state — a row, or the tier default. A module the guild
        //     has DISABLED is not occupied by anyone; it is available for anyone to re-enable.
        const guildEnabled = enabledBySlug.get(slug) ?? defaultEnabledForTier(tier);
        const occupied = !(await ownedBy(guildId, slug, tier, actingProfileId)) && guildEnabled;
        // item 4 — NO note here. "Previously installed — select to re-enable" and "Occupied by …" as
        // subtext under every description is what made the listing read as clutter; the fact belongs
        // in the private notice the member gets when they act on it.
        return {
          id: slug,
          name: entry.manifest.ui?.displayName ?? slug,
          tier,
          description: entry.manifest.description,
          icon: moduleIcon(entry.manifest.ui?.icon, applicationId),
          // The option's EMOJI is built from this, so the module's own logo can label its option.
          ...(entry.manifest.ui?.icon !== undefined ? { iconName: entry.manifest.ui.icon } : {}),
          // A NAME, not a role: "Dumby Profile", or the persona's own registered name.
          ...(occupied
            ? {
                occupied: true,
                occupiedBy: profileLabel(
                  heldByMain ? 'main' : ((await holderOf(guildId, slug)) ?? 'main'),
                  heldByMain ? undefined : await personaNameOf(holder),
                ),
              }
            : {}),
          // A disabled STANDARD module is "Previously Installed": selecting it re-enables it. Carried
          // as a STATE, not as subtext — the listing stays clean and the private notice says it.
          ...(!occupied && tier === 'standard' && !guildEnabled
            ? { previouslyInstalled: true }
            : {}),
        };
      }),
    );
    const lines: string[] =
      modules.length === 0
        ? [
            q === ''
              ? 'No marketplace modules are available to install.'
              : `No modules match "${query ?? ''}".`,
          ]
        : modules.map((m) => `${m.icon} ${m.name} — ${m.description}`);
    return { lines, modules, query: query ?? '', total: matched.length };
  }

  // item 17 — /modules lists installed/enabled modules, one page at a time (UR-20261011-009). The
  // page renders as content blocks (a Section per module, each with an inline Info control); `lines`
  // remains for the condensed (M/C) fallback.
  async function installedModules(
    page: number,
    guildId: string | null,
    applicationId: string,
    actingProfileId: string,
  ): Promise<PageData> {
    // UR-20261012-061 — what THIS PROFILE holds, not what the guild has. Core is shared and always
    // listed; a standard/marketplace module appears only for the profile that claimed it, and only
    // when it is enabled. Installing a module in the main bot no longer makes it appear here.
    const enabledBySlug = await enabledStates(guildId);
    const heldFlags = await Promise.all(
      moduleRegistry
        .all()
        .map((entry) =>
          ownedBy(guildId, entry.manifest.name, entry.manifest.tier, actingProfileId),
        ),
    );
    const enabledModules = moduleRegistry.all().filter((entry, i) => {
      const tier = entry.manifest.tier;
      if (tier === 'admin') return false;
      if (heldFlags[i] !== true) return false;
      if (tier === 'core') return true;
      return enabledBySlug.get(entry.manifest.name) ?? defaultEnabledForTier(tier);
    });
    const total = enabledModules.length;
    const pageTotal = Math.max(1, Math.ceil(total / MODULES_PAGE_SIZE));
    const current = Math.min(Math.max(page, 0), pageTotal - 1);
    const slice = enabledModules.slice(
      current * MODULES_PAGE_SIZE,
      (current + 1) * MODULES_PAGE_SIZE,
    );
    const modules = slice.map((entry) => ({
      id: entry.manifest.name,
      name: entry.manifest.ui?.displayName ?? titleCaseId(entry.manifest.name),
      tier: entry.manifest.tier,
      description: entry.manifest.description,
      icon: moduleIcon(entry.manifest.ui?.icon, applicationId),
    }));
    const lines = modules.map((m) => `${m.icon} ${m.name} (${m.tier}) — ${m.description}`);
    // item 6 / item 17 — the DIAL's entries are the PAGES, not the modules.
    //
    // This surface pages the modules directly, so a member moves between page slides, not between
    // module pages: an option per module would offer targets that do not exist. Each option names its
    // page and the range of modules on it, which is what the page actually shows.
    const navigation = modulePageNavigation(pageTotal, total, MODULES_PAGE_SIZE);
    return {
      title: 'Installed Modules',
      lines,
      modules,
      page: current,
      pageTotal,
      total,
      navigation,
    };
  }

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
    switch (moduleId) {
      case 'health':
        return health(applicationId);
      case 'persona':
        return persona(moduleId, guildId, query, applicationId);
      case 'queue':
        return queue(guildId);
      case 'permit':
        return permit(applicationId);
      case 'dashboard':
        return dashboard(page, guildId, applicationId, actingProfileId);
      case 'browse':
        return marketplace(query, guildId, applicationId, actingProfileId);
      case 'modules':
        return installedModules(page, guildId, applicationId, actingProfileId);
      default:
        return {};
    }
  };
}
