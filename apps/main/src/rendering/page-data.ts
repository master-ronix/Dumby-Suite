import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import { MARKETPLACE_MODULE_CAP, MODULES_PAGE_SIZE } from '../shared/constants/index.js';
import { defaultEnabledForTier } from '../module-system/tier-rules.js';
import { DEFAULT_EMOJI_SCOPE, commandDecorationIcon, moduleIcon } from './module-icons.js';
import {
  effectiveCommandName,
  resolveCommandStatuses,
  resolveEffectiveCommandNames,
} from '../commands/command-renames.js';

export interface PageDataDeps {
  getClient: () => Client | undefined;
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
export function createPageDataProvider(
  deps: PageDataDeps,
): (moduleId: string, guildId: string | null, page?: number, query?: string) => Promise<PageData> {
  const {
    getClient,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the scope is uniform across pages
  async function health(applicationId: string): Promise<PageData> {
    const client = getClient();
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

    const modules = moduleRegistry.all();
    const byTier = (tier: string): number =>
      modules.filter((entry) => entry.manifest.tier === tier).length;

    const gatewayReady = client?.isReady() === true;
    const discordRows: Array<readonly [string, string]> = [];
    if (client !== undefined) discordRows.push(['Gateway Ping', `${Math.round(client.ws.ping)}ms`]);
    discordRows.push(['Gateway Status', gatewayReady ? 'Connected' : 'Disconnected']);
    discordRows.push(['Shard Count', String(config.get('SHARD_COUNT'))]);

    // UR-20261011-008 — each subsystem carries a status, so the health page can lead with an
    // at-a-glance overall state and mark a degraded subsystem in place.
    const groups: Group[] = [
      { name: 'Discord API', status: gatewayReady ? 'ok' : 'down', rows: discordRows },
      {
        name: 'Bot Process',
        status: 'ok',
        rows: [
          ['Uptime', formatUptime(process.uptime())],
          ['Node.js Version', process.version],
          ['Memory Usage', mb(memory.rss)],
          ['Heap Used', mb(memory.heapUsed)],
          ['Heap Total', mb(memory.heapTotal)],
        ],
      },
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
      groups.push({
        name: 'Guilds & Users',
        status: 'ok',
        rows: [
          ['Total Guilds', String(client.guilds.cache.size)],
          ['Total Users', String(client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0))],
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
    if (client !== undefined) summaryParts.push(`${client.guilds.cache.size} guilds`);

    return {
      title: 'System Health',
      status,
      statusLabel,
      summary: summaryParts.join(' · '),
      groups,
    };
  }

  /** The resident main bot's profile id on the /persona board. */
  const MAIN_PROFILE_ID = 'main';

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
    const standard = dashboardEntries
      .filter((r) => r.mine && (enabledBySlug.get(r.entry.manifest.name) ?? true))
      .map((r) => r.entry);
    const pageTotal = 1 + standard.length;

    if (page >= 1 && page <= standard.length) {
      const entry = standard[page - 1];
      if (entry !== undefined) {
        const effective = await resolveEffectiveCommandNames(db.knex, guildId);
        const statuses = await resolveCommandStatuses(db.knex, guildId);
        // UR-20261011-009 — a module page's command list carries the neutral white-square
        // DECORATION (not a module logo), so the list reads as "this module's commands".
        const icon = commandDecorationIcon(applicationId);
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
    return { lines, pageTotal, page: 0 };
  }

  // items 1/5/6 — /browse is marketplace discovery. No in-content heading (the frame title already
  // names the surface — item 1). It lists the available, not-installed marketplace modules (item 5);
  // with a search query (item 5b) it lists only the name/description matches. The listing caps at
  // MARKETPLACE_MODULE_CAP (UR-20261011-006): one dropdown slot is reserved for the permanent Home
  // entry, so the listing and the install dropdown stay in sync within Discord's 25-option ceiling.
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
    const available = candidates.filter((entry, i) => {
      const tier = entry.manifest.tier;
      const slug = entry.manifest.name;
      const enabled = enabledBySlug.get(slug) ?? defaultEnabledForTier(tier);
      if (!enabled) return true; // installable, or re-enableable
      // Enabled: offer it only when this profile does NOT hold it — i.e. when it is occupied.
      return ownedFlags[i] !== true;
    });
    const q = (query ?? '').trim().toLowerCase();
    const matched =
      q === ''
        ? available
        : available.filter(
            (entry) =>
              entry.manifest.name.toLowerCase().includes(q) ||
              entry.manifest.description.toLowerCase().includes(q),
          );
    const shown = matched.slice(0, MARKETPLACE_MODULE_CAP);
    const modules = await Promise.all(
      shown.map(async (entry) => {
        const slug = entry.manifest.name;
        const tier = entry.manifest.tier;
        const enabled = enabledBySlug.get(slug) ?? defaultEnabledForTier(tier);
        const holder = await holderOf(guildId, slug);
        // Occupied: enabled, and held by the OTHER profile. Stated plainly and NOT offered.
        const occupied = enabled && !(await ownedBy(guildId, slug, tier, actingProfileId));
        return {
          id: slug,
          name: slug,
          description: entry.manifest.description,
          icon: moduleIcon(entry.manifest.ui?.icon, applicationId),
          ...(occupied
            ? {
                occupied: true,
                occupiedBy: holder === undefined ? 'the main bot' : 'a persona',
                note:
                  holder === undefined
                    ? 'Occupied by the main bot in this server — a persona cannot take it'
                    : 'Occupied by a persona in this server — the main bot cannot take it',
              }
            : {}),
          // A disabled STANDARD module is "Previously Installed": selecting it re-enables it.
          ...(!occupied && tier === 'standard'
            ? { note: 'Previously installed — select to re-enable' }
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
    return { title: 'Installed Modules', lines, modules, page: current, pageTotal, total };
  }

  return async (
    moduleId: string,
    guildId: string | null,
    page = 0,
    query?: string,
    // UR-20261012-057 — the application rendering the page. Its emoji ids are the only ones a message
    // from that application may reference.
    applicationId: string = DEFAULT_EMOJI_SCOPE,
    // UR-20261012-061 — WHICH profile this page reports for. 'main' for the main bot, a persona id
    // for a persona. Every page scopes its modules by it.
    actingProfileId: string = MAIN_PROFILE_ID,
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
