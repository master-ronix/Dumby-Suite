import { describe, expect, test, vi } from 'vitest';
import { createPageDataProvider, type PageDataDeps } from '../../src/rendering/page-data.js';

type Dict = Record<string, unknown>;

/** A minimal LoadedModule stand-in — the page-data layer only reads these manifest fields. */
function mod(name: string, tier: string, commands: string[], ui?: Dict): unknown {
  return {
    manifest: {
      name,
      tier,
      description: `${name} description`,
      version: '1.0.0',
      commands: commands.map((command) => ({
        name: command,
        description: `${command} description`,
      })),
      ...(ui !== undefined ? { ui } : {}),
    },
  };
}

const registry = {
  all: () => [
    mod('health', 'core', ['health']),
    mod('dashboard', 'core', ['dashboard'], { icon: 'dumby_dashboard' }),
    mod('hello-world', 'standard', ['hello'], { displayName: 'Hello World' }),
    mod('browse', 'marketplace', ['browse']),
  ],
} as unknown as PageDataDeps['moduleRegistry'];

const fakeClient = {
  ws: { ping: 42 },
  isReady: () => true,
  application: { id: 'app-1' },
  user: { username: 'dumby' },
  guilds: {
    cache: {
      size: 2,
      reduce: (fn: (sum: number, g: { memberCount: number }) => number, init: number): number =>
        fn(fn(init, { memberCount: 3 }), { memberCount: 4 }),
    },
  },
};

function makeDeps(over: Dict = {}): PageDataDeps {
  const knex = (() => ({
    where: () => ({
      whereNull: () => ({ orderBy: () => ({ select: async (): Promise<unknown[]> => [] }) }),
    }),
  })) as unknown as Dict;
  knex['raw'] = async (): Promise<unknown[]> => [{}];
  return {
    getClient: () => undefined,
    moduleRegistry: registry,
    db: { knex },
    redis: { ping: async () => 'PONG' },
    config: { get: (key: string) => (key === 'SHARD_COUNT' ? 2 : undefined) },
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    ...over,
  } as unknown as PageDataDeps;
}

describe('page-data provider', () => {
  test('health reports system groups and connects to db and cache', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('health', null);

    expect(data['title']).toBe('System Health');
    expect(typeof data['statusLabel']).toBe('string');
    expect(typeof data['summary']).toBe('string');
    const groups = data['groups'] as Array<{ name: string; status?: string; rows: unknown[] }>;
    expect(groups.map((group) => group.name)).toContain('Bot Process');
    expect(groups.map((group) => group.name)).toContain('Database');
    expect(groups.map((group) => group.name)).toContain('Cache');
    // each subsystem carries a status for the at-a-glance layout
    expect(groups.find((group) => group.name === 'Database')?.status).toBe('ok');
    expect(groups.find((group) => group.name === 'Cache')?.status).toBe('ok');
    // no client → the Guilds & Users group is omitted rather than invented
    expect(groups.map((group) => group.name)).not.toContain('Guilds & Users');
  });

  test('health adds the guild/user group when a client is present', async () => {
    const provider = createPageDataProvider(makeDeps({ getClient: () => fakeClient }));
    const data = await provider('health', null);
    const groups = data['groups'] as Array<{ name: string }>;
    expect(groups.map((group) => group.name)).toContain('Guilds & Users');
  });

  test('health degrades to Unavailable when db and redis throw', async () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const knex = (() => ({})) as unknown as Dict;
    knex['raw'] = async (): Promise<never> => {
      throw new Error('down');
    };
    const provider = createPageDataProvider(
      makeDeps({
        db: { knex },
        redis: {
          ping: async (): Promise<never> => {
            throw new Error('down');
          },
        },
        logger,
      }),
    );
    const data = await provider('health', null);
    expect(data['status']).toBe('down');
    const groups = data['groups'] as Array<{ name: string; rows: Array<[string, string]> }>;
    const db = groups.find((group) => group.name === 'Database');
    const cache = groups.find((group) => group.name === 'Cache');
    expect(db?.rows[0]?.[1]).toBe('Unavailable');
    expect(cache?.rows[0]?.[1]).toBe('Unavailable');
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  test('health is degraded when only the cache is down', async () => {
    const provider = createPageDataProvider(
      makeDeps({
        getClient: () => fakeClient,
        redis: {
          ping: async (): Promise<never> => {
            throw new Error('down');
          },
        },
      }),
    );
    const data = await provider('health', null);
    expect(data['status']).toBe('degraded');
    expect(data['statusLabel']).toBe('Degraded');
    const groups = data['groups'] as Array<{ name: string; status?: string }>;
    expect(groups.find((group) => group.name === 'Cache')?.status).toBe('down');
    expect(groups.find((group) => group.name === 'Discord API')?.status).toBe('ok');
  });

  test('persona lists the bound modules and command inventory', async () => {
    const provider = createPageDataProvider(makeDeps({ getClient: () => fakeClient }));
    const data = await provider('persona', null);
    expect(data['title']).toBe('Active Personas');
    expect(JSON.stringify(data)).toContain('Bound Modules');
  });

  test('queue without a guild performs no query and reports none pending', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('queue', null);
    expect(data['title']).toBe('Pending Command Queue Actions');
    expect(data['lines']).toEqual(['No pending queue actions.']);
  });

  test('queue lists pending entries for a guild', async () => {
    const rows = [
      { commandKey: 'ban', payload: { action: 'rename', newName: 'timeout' } },
      { commandKey: 'kick', payload: { action: 'alias', alias: 'yeet', disable: false } },
    ];
    const knex = (() => ({
      where: () => ({
        whereNull: () => ({ orderBy: () => ({ select: async () => rows }) }),
      }),
    })) as unknown as Dict;
    knex['raw'] = async () => [{}];
    const provider = createPageDataProvider(makeDeps({ db: { knex } }));
    const data = await provider('queue', 'guild-1');
    const lines = data['lines'] as string[];
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Command: ban');
    expect(lines[1]).toContain('Alias: yeet');
  });

  test('queue warns and reports none pending when the query throws', async () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const knex = (() => ({
      where: () => ({
        whereNull: () => ({
          orderBy: () => ({
            select: async (): Promise<never> => {
              throw new Error('db down');
            },
          }),
        }),
      }),
    })) as unknown as Dict;
    knex['raw'] = async () => [{}];
    const provider = createPageDataProvider(makeDeps({ db: { knex }, logger }));
    const data = await provider('queue', 'guild-1');
    expect(data['lines']).toEqual(['No pending queue actions.']);
    expect(logger.warn).toHaveBeenCalledWith('page-data-queue-unavailable', expect.any(Object));
  });

  test('permit lists a selectable command per module command', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('permit', null);
    const lines = data['lines'] as string[];
    expect(lines.some((line) => line.includes('/health'))).toBe(true);
    // ADR-013 — no version string leaks onto the surface
    expect(lines.every((line) => !line.includes('v1.0.0'))).toBe(true);
  });

  test('dashboard page 0 renders the core command list with icons', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 0);
    const lines = data['lines'] as string[];
    // UR-20261011-009 — a module with no declared logo shows the framework FALLBACK logo (📦),
    // not the white-square decoration (which is only for a module page's own command list).
    expect(lines).toContain('📦 `/health`');
    expect(data['pageTotal']).toBe(2);
  });

  test('dashboard page 1 renders the standard module page with its commands, icon and identity', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 1);
    // item 4 — the module icon sits beside every module command list, module pages included.
    expect(data['lines']).toEqual(['⬜ `/hello`']);
    // item 7 — the page names its owning module, so the frame resolves THAT module's identity
    // (its banner and footer), not the dashboard's.
    expect(data['pageModuleId']).toBe('hello-world');
    expect(data['pageModuleName']).toBe('Hello World');
  });

  test('dashboard page out of range falls back to the main page', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 99);
    expect(data['page']).toBe(0);
  });

  test('marketplace lists available modules without an in-content title', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('browse', null);
    // item 1 — no in-content "Marketplace" heading (the frame title already names the surface).
    expect(data['title']).toBeUndefined();
    expect(JSON.stringify(data)).toContain('browse');
    expect((data['modules'] as unknown[]).length).toBe(1);
  });

  test('marketplace search filters the available modules by name', async () => {
    const provider = createPageDataProvider(makeDeps());
    const hit = await provider('browse', null, 0, 'brow');
    expect((hit['modules'] as unknown[]).length).toBe(1);
    const miss = await provider('browse', null, 0, 'zzz');
    expect((miss['modules'] as unknown[]).length).toBe(0);
  });

  test('marketplace caps the per-page listing at 24 (one dropdown slot reserved for Home)', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      mod(`mp-${String(i).padStart(2, '0')}`, 'marketplace', ['x']),
    );
    const bigRegistry = {
      all: () => [mod('health', 'core', ['health']), ...many],
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: bigRegistry }));
    const data = await provider('browse', null);
    // UR-20261011-006 — the install dropdown's permanent Home option takes one of the 25 slots,
    // so the per-page module listing caps at 24; `total` still reports every match.
    expect((data['modules'] as unknown[]).length).toBe(24);
    expect(data['total']).toBe(30);
  });

  test('marketplace reports none when there are no marketplace modules', async () => {
    const emptyRegistry = {
      all: () => [mod('health', 'core', ['health'])],
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: emptyRegistry }));
    const data = await provider('browse', null);
    expect(
      (data['lines'] as string[]).some((line) => line.includes('No marketplace modules')),
    ).toBe(true);
  });

  test('installedModules lists every loaded module', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('modules', null);
    expect(data['title']).toBe('Installed Modules');
    expect((data['modules'] as unknown[]).length).toBe(4);
  });

  test('installedModules paginates the module list (UR-20261011-009)', async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      mod(`mp-${String(i).padStart(2, '0')}`, 'marketplace', ['x']),
    );
    const bigRegistry = {
      all: () => many,
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: bigRegistry }));
    const first = await provider('modules', null, 0);
    expect(first['pageTotal']).toBe(3);
    expect((first['modules'] as unknown[]).length).toBe(6);
    const second = await provider('modules', null, 1);
    expect(second['page']).toBe(1);
    expect((second['modules'] as unknown[]).length).toBe(6);
    // an out-of-range page clamps to the last page rather than rendering empty
    const clamped = await provider('modules', null, 9);
    expect(clamped['page']).toBe(2);
    expect((clamped['modules'] as unknown[]).length).toBe(3);
  });

  test('an unknown module id yields empty page data', async () => {
    const provider = createPageDataProvider(makeDeps());
    expect(await provider('nope', null)).toEqual({});
  });
});
