import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import { MARKETPLACE_MODULE_CAP } from '../shared/constants/index.js';
import { moduleIcon } from './module-icons.js';
import {
  effectiveCommandName,
  resolveCommandStatuses,
  resolveEffectiveCommandNames,
} from '../commands/command-renames.js';

export interface PageDataDeps {
  getClient: () => Client | undefined;
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
  const { getClient, moduleRegistry, db, redis, config, logger } = deps;

  async function health(): Promise<PageData> {
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

    const discordRows: Array<readonly [string, string]> = [];
    if (client !== undefined) discordRows.push(['Gateway Ping', `${Math.round(client.ws.ping)}ms`]);
    discordRows.push(['Gateway Status', client?.isReady() === true ? 'Connected' : 'Disconnected']);
    discordRows.push(['Shard Count', String(config.get('SHARD_COUNT'))]);

    const groups: Group[] = [
      { name: 'Discord API', rows: discordRows },
      {
        name: 'Bot Process',
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
        rows: [
          ['Total Loaded', String(modules.length)],
          ['Core-tier', String(byTier('core'))],
          ['Standard-tier', String(byTier('standard'))],
          ['Marketplace-tier', String(byTier('marketplace'))],
          ['Admin-tier', String(byTier('admin'))],
        ],
      },
      { name: 'Database', rows: [['PostgreSQL Status', dbStatus]] },
      { name: 'Cache', rows: [['Redis Status', redisStatus]] },
    ];

    if (client !== undefined) {
      groups.push({
        name: 'Guilds & Users',
        rows: [
          ['Total Guilds', String(client.guilds.cache.size)],
          ['Total Users', String(client.guilds.cache.reduce((sum, g) => sum + g.memberCount, 0))],
        ],
      });
    }

    return { title: '📊 SYSTEM HEALTH REPORT', groups };
  }

  async function persona(): Promise<PageData> {
    const client = getClient();
    const modules = moduleRegistry.all();
    const rows: Array<readonly [string, string]> = [];
    if (client?.application?.id !== undefined) rows.push(['Application ID', client.application.id]);
    if (client?.user?.username !== undefined) rows.push(['Display Name', client.user.username]);
    rows.push(['Bound Server', 'this guild (primary deployment)']);
    rows.push(['Shards', String(config.get('SHARD_COUNT'))]);
    rows.push([
      'Bound Modules',
      `${modules.length} (${modules.map((entry) => entry.manifest.name).join(', ')})`,
    ]);
    rows.push(['DM Behavior', 'Prohibited (main bot)']);
    rows.push(['Status', client?.isReady() === true ? '● Online' : '● Offline']);

    const inventory = modules
      .map((entry) => `/${entry.manifest.commands.map((command) => command.name).join(' /')}`)
      .join('   ');

    return {
      title: 'Active Personas',
      groups: [{ name: 'Main Bot (Primary)', rows }],
      lines: [
        'Command Inventory (Main Bot):',
        inventory,
        '',
        'ℹ️ Persona creation and configuration are handled through the Twill registration API.',
      ],
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

  async function permit(): Promise<PageData> {
    const lines: string[] = ['Choose a module command to manage grant access:', ''];
    for (const entry of moduleRegistry.all()) {
      const icon = moduleIcon(entry.manifest.ui?.icon);
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
  async function dashboard(page: number, guildId: string | null): Promise<PageData> {
    const all = moduleRegistry.all();
    const standard = all.filter((entry) => entry.manifest.tier === 'standard');
    const pageTotal = 1 + standard.length;

    if (page >= 1 && page <= standard.length) {
      const entry = standard[page - 1];
      if (entry !== undefined) {
        const effective = await resolveEffectiveCommandNames(db.knex, guildId);
        const statuses = await resolveCommandStatuses(db.knex, guildId);
        const icon = moduleIcon(entry.manifest.ui?.icon);
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
      const icon = moduleIcon(entry.manifest.ui?.icon);
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
  async function marketplace(query?: string): Promise<PageData> {
    const available = moduleRegistry.all().filter((entry) => entry.manifest.tier === 'marketplace');
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
    const modules = shown.map((entry) => ({
      id: entry.manifest.name,
      name: entry.manifest.name,
      description: entry.manifest.description,
      icon: moduleIcon(entry.manifest.ui?.icon),
    }));
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

  // item 17 — /modules lists only installed/enabled modules.
  async function installedModules(): Promise<PageData> {
    const lines = moduleRegistry.all().map((entry) => {
      const icon = moduleIcon(entry.manifest.ui?.icon);
      return `${icon} ${entry.manifest.name} (${entry.manifest.tier}) — ${entry.manifest.description}`;
    });
    lines.push('', 'Use the info and uninstall buttons beside a module to manage it.');
    return {
      title: 'Installed Modules',
      lines,
      modules: moduleRegistry.all().map((entry) => ({ id: entry.manifest.name })),
    };
  }

  return async (
    moduleId: string,
    guildId: string | null,
    page = 0,
    query?: string,
  ): Promise<PageData> => {
    switch (moduleId) {
      case 'health':
        return health();
      case 'persona':
        return persona();
      case 'queue':
        return queue(guildId);
      case 'permit':
        return permit();
      case 'dashboard':
        return dashboard(page, guildId);
      case 'browse':
        return marketplace(query);
      case 'modules':
        return installedModules();
      default:
        return {};
    }
  };
}
