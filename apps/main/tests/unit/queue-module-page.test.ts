import { describe, test, expect } from 'vitest';
import { queuePage } from '@module-queue-page';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the queue module's OWN page, tested where the code now lives. What it owns is the
 * formatting of what is waiting; the framework owns the read, so the read-model is the whole seam.
 */
function readModel(
  entries: readonly unknown[],
  over: Partial<ModulePageReadModel> = {},
): ModulePageReadModel {
  return {
    list: async (): Promise<readonly ModuleSummary[]> => [],
    installState: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async () => true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async () => 'ICON',
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: async () => ({ profileId: 'main', gatewayReady: true, loadedModules: [] }),
    heldModules: async () => [],
    shardCount: async () => 1,
    guilds: async () => ({ total: 0, source: 'cache' }),
    hostProcess: () => ({
      uptimeSeconds: 0,
      nodeVersion: 'v20.20.2',
      memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
    }),
    pendingQueue: async () => entries as never,
    ...over,
  };
}

const ctx = { guildId: 'g1', applicationId: 'app-1', profileId: 'main', page: 0 };

describe('queue module page — the composition that moved out of page-data.ts', () => {
  test('an empty queue says so in one line, and still reports the window', async () => {
    const data = await queuePage.render(ctx, readModel([]));
    expect(data.lines).toEqual(['No pending queue actions.']);
    expect(data.title).toBe('Pending Command Queue Actions');
    expect(data.groups[0]?.rows?.[1]).toEqual(['Total queued', '0']);
  });

  test('each pending action is numbered and carries its fields', async () => {
    const data = await queuePage.render(
      ctx,
      readModel([
        { commandKey: 'ping', action: 'rename', newName: 'pong' },
        { commandKey: 'help', action: 'alias', alias: 'h', disable: true },
      ]),
    );
    expect(data.lines).toEqual([
      '#1   |   Action: rename   |   Command: ping   |   New Name: pong   |   Status: Queued',
      '#2   |   Action: alias   |   Command: help   |   Alias: h   |   Disable: true   |   Status: Queued',
    ]);
    expect(data.groups[0]?.rows?.[1]).toEqual(['Total queued', '2']);
  });

  test('a payload with no fields still renders as a queued action', async () => {
    const data = await queuePage.render(ctx, readModel([{ commandKey: 'x', action: 'rename' }]));
    expect(data.lines).toEqual(['#1   |   Action: rename   |   Command: x   |   Status: Queued']);
  });
});
