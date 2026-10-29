import { describe, test, expect } from 'vitest';
import { permitPage } from '../src/pages/permit.page.js';
import type { ModulePageReadModel, ModuleSummary } from '@workspace/swastik';

/**
 * UR-20261027-106 — the permit module's OWN page: step 1 of the grant-access flow. What it owns is the
 * listing — every grantable command, grouped by the module that declares it, each with that module's
 * own icon — and the precedence rule it states beside them.
 */
const modules: readonly ModuleSummary[] = [
  {
    slug: 'health',
    tier: 'core',
    description: 'h',
    iconName: 'dumby_health',
    commands: [{ name: 'health', description: 'health description' }],
  },
  {
    slug: 'hello-world',
    tier: 'standard',
    description: 's',
    commands: [
      { name: 'hello', description: 'hello description' },
      { name: 'hello-config', description: 'config description' },
    ],
  },
];

function readModel(over: Partial<ModulePageReadModel> = {}): ModulePageReadModel {
  return {
    list: async () => modules,
    installState: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async () => true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async (iconName) => (iconName === undefined ? 'FALLBACK' : `[${iconName}]`),
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: async () => ({
      profileId: 'main',
      gatewayReady: true,
      loadedModules: [],
    }),
    heldModules: async () => [],
    shardCount: async () => 1,
    guilds: async () => ({ total: 0, source: 'cache' }),
    hostProcess: () => ({
      uptimeSeconds: 0,
      nodeVersion: 'v20.20.2',
      memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
    }),
    pendingQueue: async () => [],
    ...over,
  };
}

const ctx = {
  guildId: 'g1',
  applicationId: 'app-1',
  profileId: 'main',
  page: 0,
};

describe('permit module page — the composition that moved out of page-data.ts', () => {
  test('every module command is offered, with its own module icon and description', async () => {
    const data = await permitPage.render(ctx, readModel());
    expect(data.title).toBe('Grant Access — Step 1: Select Command');
    expect(data.lines).toEqual([
      'Choose a module command to manage grant access:',
      '',
      '[dumby_health] /health   health — health description',
      'FALLBACK /hello   hello-world — hello description',
      'FALLBACK /hello-config   hello-world — config description',
      '',
      '§8.4 — grants resolve role > group > set, most-specific-wins, and never override Layers 1–3,',
      'the bot-capability check, or the RESTRICTED floor. Layer 6 ranks are evaluated, never written.',
    ]);
  });

  test('a module with no commands contributes nothing to the list', async () => {
    const data = await permitPage.render(
      ctx,
      readModel({
        list: async () => [{ slug: 'empty', tier: 'core', description: 'e', commands: [] }],
      }),
    );
    // Only the heading, the blank line and the rule remain.
    expect(data.lines).toHaveLength(5);
    expect(data.lines.some((line) => line.includes('/'))).toBe(false);
  });
});
