import { definePage, type ModulePageContext, type ModulePageReadModel } from '@workspace/swastik';
import { healthBlocks } from '../blocks/health.blocks.js';

/**
 * UR-20261027-106 — the health module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`health()`), a core-base
 * file serving seven modules. Every fact it needs arrives through `ModulePageReadModel`; what it owns
 * is the page — which subsystems are shown, in what order, how the overall state is derived from them,
 * and how each number is labelled.
 *
 * The labelling is the part worth keeping: a persona has no memory of her own, so the host's process
 * metrics are named "Host Process (shared)" rather than reported as hers, and her own uptime is shown
 * beside it only when her runtime has started.
 */
type Rows = ReadonlyArray<readonly [string, string]>;

interface Group {
  readonly name: string;
  readonly rows: Rows;
  readonly status: 'ok' | 'degraded' | 'down';
}

export interface HealthPageData {
  title: string;
  status: 'operational' | 'degraded' | 'down';
  statusLabel: string;
  summary: string;
  groups: Group[];
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

export const healthPage = definePage({
  id: 'health',

  async render(
    context: ModulePageContext,
    read: ModulePageReadModel,
  ): Promise<{ data: HealthPageData; blocks: readonly Record<string, unknown>[] }> {
    const acting = await read.actingProfile();
    const reach = await read.probe();
    const held = new Set(await read.heldModules());
    const modules = (await read.list()).filter(
      (module) => module.tier === 'core' || module.tier === 'admin' || held.has(module.slug),
    );
    const byTier = (tier: string): number =>
      modules.filter((module) => module.tier === tier).length;
    const host = await read.hostProcess();
    const shards = await read.shardCount();

    const discordRows: Array<readonly [string, string]> = [];
    if (acting.gatewayPingMs !== undefined) {
      discordRows.push(['Gateway Ping', `${Math.round(acting.gatewayPingMs)}ms`]);
    }
    discordRows.push(['Gateway Status', acting.gatewayReady ? 'Connected' : 'Disconnected']);
    discordRows.push(['Shard Count', String(shards)]);

    const groups: Group[] = [
      { name: 'Discord API', status: acting.gatewayReady ? 'ok' : 'down', rows: discordRows },
      {
        // Q1 — SHARED, and named so. Memory, heap and the Node runtime belong to the one process that
        // serves every profile; a persona has none of her own.
        name: 'Host Process (shared)',
        status: 'ok',
        rows: [
          ['Host Uptime', formatUptime(host.uptimeSeconds)],
          ['Node.js Version', host.nodeVersion],
          ['Memory Usage', mb(host.memory.rss)],
          ['Heap Used', mb(host.memory.heapUsed)],
          ['Heap Total', mb(host.memory.heapTotal)],
        ],
      },
      // Q4 — HER uptime, beside the host's, each labelled: a persona's runtime starts when she is
      // hosted, which is not when the process started.
      ...(acting.startedAt !== undefined
        ? [
            {
              name: 'Profile Runtime',
              status: 'ok' as const,
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
        status: reach.database === 'connected' ? 'ok' : 'down',
        rows: [['PostgreSQL Status', reach.database === 'connected' ? 'Connected' : 'Unavailable']],
      },
      {
        name: 'Cache',
        status: reach.redis === 'connected' ? 'ok' : 'down',
        rows: [['Redis Status', reach.redis === 'connected' ? 'Connected' : 'Unavailable']],
      },
    ];

    const counts = await read.guilds();
    if (counts.total > 0 || counts.members !== undefined) {
      groups.push({
        name: 'Guilds & Users',
        status: 'ok',
        rows: [
          ['Total Guilds', String(counts.total)],
          // A cache that has not filled yet is not a zero — say so rather than printing 0.
          ['Total Users', counts.members === undefined ? 'not yet cached' : String(counts.members)],
          ['Source', counts.source === 'live' ? 'Discord API' : 'Cached snapshot'],
        ],
      });
    }

    // The overall state is the worst subsystem: a critical one (the gateway or the database) down is
    // `down`; a non-critical one (the cache) down is `degraded`; else `operational`.
    const criticalDown = groups.some(
      (group) =>
        group.status === 'down' && (group.name === 'Discord API' || group.name === 'Database'),
    );
    const anyDown = groups.some((group) => group.status === 'down');
    const status = criticalDown ? 'down' : anyDown ? 'degraded' : 'operational';
    const statusLabel =
      status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Down';

    const data: HealthPageData = {
      title: 'System Health',
      status,
      statusLabel,
      summary: statusLabel,
      groups,
    };

    // UR-20261029-113 — the module composes its OWN content blocks. The framework renders them and
    // contributes only its chrome, which is what keeps the zone grammar enforceable.
    return {
      data,
      blocks: healthBlocks(
        data as Readonly<Record<string, unknown>>,
        context.profileId,
        context.emoji,
        context.emojiParts,
      ),
    };
  },
});
