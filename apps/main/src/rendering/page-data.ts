import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';
import { moduleIcon } from './module-icons.js';

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

/**
 * §1.7 — the host side of the page-data channel. A module cannot see the running system, so every
 * value a page reports about it is gathered here, at dispatch, and handed to the handler. Only
 * values that are actually reachable are reported: a group with no data is omitted rather than
 * filled with a placeholder, because an invented number on a health page is worse than a missing
 * one.
 */
export function createPageDataProvider(
  deps: PageDataDeps,
): (moduleId: string, guildId: string | null, page?: number) => Promise<PageData> {
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
    discordRows.push([
      'Gateway Status',
      client?.isReady() === true ? 'Connected' : 'Disconnected',
    ]);
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
        lines.push(
          `${icon} /${command.name}   ${entry.manifest.name} v${entry.manifest.version} — ${command.description}`,
        );
      }
    }
    lines.push(
      '',
      '§8.4 — grants resolve role > group > set, most-specific-wins, and never override Layers 1–3,',
      'the bot-capability check, or the RESTRICTED floor. Layer 6 ranks are evaluated, never written.',
    );
    return { title: 'Grant Access — Step 1: Select Command', lines };
  }

  // UR-004 items 1/2/3 — page 0 is the main dashboard (core commands); page 1..n is each
  // standard-tier module's page. item 5 — only the main page shows each command's module icon
  // (declared custom emoji, else the framework's default white icon); a module page does not.
  async function dashboard(page: number): Promise<PageData> {
    const all = moduleRegistry.all();
    const standard = all.filter((entry) => entry.manifest.tier === 'standard');
    const pageTotal = 1 + standard.length;

    if (page >= 1 && page <= standard.length) {
      const entry = standard[page - 1];
      if (entry !== undefined) {
        // items 4/5/14 - a module page shows only its registered commands: no heading (the frame's
        // title already names the page) and no module icon beside them.
        return {
          lines: entry.manifest.commands.map((command) => `\`/${command.name}\``),
          pageTotal,
          page,
        };
      }
    }

    // item 5 - only the main dashboard page shows each core command's module icon: the declared
    // custom emoji, else the framework's default white icon.
    const lines: string[] = [];
    for (const entry of all) {
      if (entry.manifest.tier !== 'core') continue;
      const icon = moduleIcon(entry.manifest.ui?.icon);
      for (const command of entry.manifest.commands) {
        lines.push(`${icon} \`/${command.name}\``);
      }
    }
    // item 4 - no per-page heading; the frame's "Dumby Suite | Dashboard" title already names it.
    return { lines, pageTotal, page: 0 };
  }

  // items 10/11/15 — /browse is marketplace discovery: only installable modules are offered.
  async function marketplace(): Promise<PageData> {
    const installable = moduleRegistry
      .all()
      .filter((entry) => entry.manifest.tier === 'marketplace');
    const lines: string[] = [
      'Search for a module with the search bar, then select one to install.',
      '',
    ];
    if (installable.length === 0) {
      lines.push('No marketplace modules are available to install.');
    } else {
      for (const entry of installable) {
        const icon = moduleIcon(entry.manifest.ui?.icon);
        lines.push(`${icon} ${entry.manifest.name} — ${entry.manifest.description}`);
      }
    }
    return {
      title: 'Marketplace',
      lines,
      modules: installable.map((entry) => ({ id: entry.manifest.name })),
    };
  }

  // item 17 — /modules lists only installed/enabled modules.
  async function installedModules(): Promise<PageData> {
    const lines = moduleRegistry
      .all()
      .map((entry) => {
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

  return async (moduleId: string, guildId: string | null, page = 0): Promise<PageData> => {
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
        return dashboard(page);
      case 'browse':
        return marketplace();
      case 'modules':
        return installedModules();
      default:
        return {};
    }
  };
}
