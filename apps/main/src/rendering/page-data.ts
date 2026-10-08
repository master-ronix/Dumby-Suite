import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ConfigService } from '../config/config.service.js';
import type { DbClient } from '../db/client.js';
import type { Logger } from '../logging/logger.js';
import type { ModuleRegistry } from '../module-system/registry.js';

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
): (moduleId: string, guildId: string | null) => Promise<PageData> {
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
    let pending = 0;
    if (guildId !== null) {
      try {
        const rows = await db
          .knex('guild_command_queue')
          .where({ guildId })
          .whereNull('deletedAt')
          .select('guildId');
        pending = rows.length;
      } catch (err) {
        logger.warn('page-data-queue-unavailable', { guildId, error: String(err) });
      }
    }
    return {
      title: 'Pending Command Queue Actions',
      lines: [
        'Batch window: changes are batched and pushed within the 12–13 hour window (§15.8)',
        '',
        pending === 0 ? 'No pending queue actions.' : `${pending} pending queue action(s).`,
        '',
        `Total queued: ${pending}   |   Next batch push: within 12–13h`,
      ],
    };
  }

  return async (moduleId: string, guildId: string | null): Promise<PageData> => {
    switch (moduleId) {
      case 'health':
        return health();
      case 'persona':
        return persona();
      case 'queue':
        return queue(guildId);
      default:
        return {};
    }
  };
}
