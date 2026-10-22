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

/**
 * A chainable, thenable knex stand-in for the persona tables. `andWhere` invokes its callback with
 * the same builder so the grouped `boundGuildId OR id IN (...)` predicate is exercised.
 */
function personaKnex(bindingRows: unknown[], personaRows: unknown[]): Dict {
  const knex = ((table: string) => {
    const rows = table === 'guild_persona_bindings' ? bindingRows : personaRows;
    const builder: Dict = {};
    builder['where'] = () => builder;
    builder['whereIn'] = () => builder;
    builder['orWhereIn'] = () => builder;
    builder['whereNull'] = () => builder;
    builder['andWhere'] = (cb: (b: unknown) => void) => {
      cb(builder);
      return builder;
    };
    builder['then'] = (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve);
    return builder;
  }) as unknown as Dict;
  knex['raw'] = async () => [{}];
  return knex;
}

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
    const data = await provider('health', null, 0, undefined, 'app-1', 'main');

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
    const data = await provider('health', null, 0, undefined, 'app-1', 'main');
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
    const data = await provider('health', null, 0, undefined, 'app-1', 'main');
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
    const data = await provider('health', null, 0, undefined, 'app-1', 'main');
    expect(data['status']).toBe('degraded');
    expect(data['statusLabel']).toBe('Degraded');
    const groups = data['groups'] as Array<{ name: string; status?: string }>;
    expect(groups.find((group) => group.name === 'Cache')?.status).toBe('down');
    expect(groups.find((group) => group.name === 'Discord API')?.status).toBe('ok');
  });

  test('persona opens on the main bot when the guild has no personas', async () => {
    const provider = createPageDataProvider(makeDeps({ getClient: () => fakeClient }));
    const data = await provider('persona', null, 0, undefined, 'app-1', 'main');
    expect(data['title']).toBe('Active Personas');
    expect(data['status']).toBe('online');
    expect(data['currentProfileId']).toBe('main');
    const profiles = data['profiles'] as Array<{ id: string; name: string; isMain: boolean }>;
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.isMain).toBe(true);
    expect(profiles[0]?.name).toBe('dumby');
    const tiers = data['tiers'] as Array<{ tier: string; modules: unknown[] }>;
    expect(tiers.length).toBeGreaterThan(0);
    expect(tiers[0]?.modules.length).toBeGreaterThan(0);
  });

  test('persona lists the guild personas and opens on the one running the command', async () => {
    const personaRegistry = {
      all: () => [
        mod('persona', 'core', ['persona'], { icon: 'dumby_persona' }),
        mod('health', 'core', ['health']),
        mod('hello-world', 'standard', ['hello']),
      ],
    } as unknown as PageDataDeps['moduleRegistry'];
    const bindingRows = [{ moduleSlug: 'persona', personaId: 'p-2' }];
    const personaRows = [
      {
        id: 'p-2',
        name: 'Aurora',
        discordApplicationId: 'app-2',
        dmBehavior: 'allowed',
        shardAllocation: 1,
        status: 'active',
      },
    ];
    const knex = personaKnex(bindingRows, personaRows);
    const provider = createPageDataProvider(
      makeDeps({ getClient: () => fakeClient, moduleRegistry: personaRegistry, db: { knex } }),
    );

    const data = await provider('persona', 'guild-1', 0, undefined, 'app-1', 'main');
    const profiles = data['profiles'] as Array<{
      id: string;
      isMain: boolean;
      commandCount: number;
    }>;
    expect(profiles.map((p) => p.id)).toEqual(['main', 'p-2']);
    // UR-20261012-051 — the opening profile is the identity RUNNING the command. This provider runs in
    // the main bot's process (`PERSONA_ID` unset), so the main bot's own `/persona` opens on the MAIN
    // profile. It used to open on whichever persona owned the `persona` module, which is why the
    // operator saw a persona profile instead of their own bot's.
    expect(data['currentProfileId']).toBe('main');
    expect(data['selectedProfileId']).toBe('main');
    // UR-20261012-054 — the tiers describe the OPENING profile's CLAIMED modules, and CORE IS NEVER
    // LISTED: a core module is shared without dispute, so listing it under a profile is noise and
    // made every profile look identical. Only the standard module the main bot actually holds appears.
    const openingTiers = data['tiers'] as Array<{ tier: string; modules: Array<{ name: string }> }>;
    expect(openingTiers.flatMap((t) => t.modules.map((m) => m.name)).sort()).toEqual([
      'hello-world',
    ]);
    expect(openingTiers.map((t) => t.tier)).not.toContain('core');
    // No command inventory travels with a module any more.
    expect(
      openingTiers.every((t) =>
        t.modules.every((m) => (m as { commands?: unknown }).commands === undefined),
      ),
    ).toBe(true);

    // switching to the main bot shows the modules it still owns
    // the provider's signature is (moduleId, guildId, page, query) — the selected persona id
    // travels on the query channel (as the router passes options.query fourth).
    const switched = await provider('persona', 'guild-1', 0, 'main', 'app-1', 'main');
    expect(switched['selectedProfileId']).toBe('main');
    const mainTiers = switched['tiers'] as Array<{ modules: Array<{ name: string }> }>;
    // UR-20261012-054 — same rule on the switched view: claimed non-core modules only.
    expect(mainTiers.flatMap((t) => t.modules.map((m) => m.name))).toEqual(['hello-world']);
  });

  test('persona reads Online, states presence separately, and offers the invite URL', async () => {
    const personaRegistry = {
      all: () => [mod('persona', 'core', ['persona']), mod('health', 'core', ['health'])],
    } as unknown as PageDataDeps['moduleRegistry'];
    const personaRows = [
      {
        id: 'p-9',
        name: 'Nova',
        discordApplicationId: 'app-9',
        boundGuildId: 'guild-1',
        dmBehavior: 'prohibited',
        shardAllocation: 1,
        status: 'active',
        oauthClientSecretSealed: { ciphertext: 'x' },
      },
    ];
    const knex = personaKnex([], personaRows);
    const isMember = vi.fn(
      async (_guildId: string, applicationId: string) => applicationId === 'app-9',
    );
    const personaInvite = vi.fn(() => 'https://dumby.example/auth/authorize?app=app-9');

    const provider = createPageDataProvider(
      makeDeps({
        getClient: () => fakeClient,
        moduleRegistry: personaRegistry,
        db: { knex },
        isMember,
        personaInvite,
      }),
    );
    const data = await provider('persona', 'guild-1', 0, undefined, 'app-1', 'main');
    // UR-20261012-051 — a guild registration is NOT the opening profile. The identity running the
    // command is, and that is the main bot here.
    expect(data['currentProfileId']).toBe('main');
    expect(isMember).toHaveBeenCalledWith('guild-1', 'app-9');
    const profiles = data['profiles'] as Array<{
      id: string;
      statusLabel: string;
      present: boolean;
      hasOAuth: boolean;
      inviteUrl: string;
    }>;
    const nova = profiles.find((p) => p.id === 'p-9');
    // registered => Online, whether or not its bot is in the guild
    expect(nova?.statusLabel).toBe('Online');
    expect(nova?.present).toBe(true);
    expect(nova?.hasOAuth).toBe(true);
    expect(nova?.inviteUrl).toBe('https://dumby.example/auth/authorize?app=app-9');
    expect(personaInvite).toHaveBeenCalledWith({
      applicationId: 'app-9',
      guildId: 'guild-1',
      withOAuth: true,
    });

    // absent from the guild => still Online, but presence is false
    const away = createPageDataProvider(
      makeDeps({
        getClient: () => fakeClient,
        moduleRegistry: personaRegistry,
        db: { knex },
        isMember: async () => false,
        personaInvite: () => 'u',
      }),
    );
    const awayProfiles = (await away('persona', 'guild-1'))['profiles'] as Array<{
      id: string;
      statusLabel: string;
      present: boolean;
    }>;
    const awayNova = awayProfiles.find((p) => p.id === 'p-9');
    expect(awayNova?.statusLabel).toBe('Online');
    expect(awayNova?.present).toBe(false);
  });

  test('persona warns and falls back to the main bot when the persona read fails', async () => {
    const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const knex = (() => {
      throw new Error('db down');
    }) as unknown as Dict;
    const provider = createPageDataProvider(
      makeDeps({ getClient: () => fakeClient, db: { knex }, logger }),
    );
    const data = await provider('persona', 'guild-1', 0, undefined, 'app-1', 'main');
    const profiles = data['profiles'] as Array<{ id: string }>;
    expect(profiles.map((p) => p.id)).toEqual(['main']);
    expect(logger.warn).toHaveBeenCalledWith('page-data-persona-unavailable', expect.any(Object));
  });

  test('queue without a guild performs no query and reports none pending', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('queue', null, 0, undefined, 'app-1', 'main');
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
    const data = await provider('queue', 'guild-1', 0, undefined, 'app-1', 'main');
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
    const data = await provider('queue', 'guild-1', 0, undefined, 'app-1', 'main');
    expect(data['lines']).toEqual(['No pending queue actions.']);
    expect(logger.warn).toHaveBeenCalledWith('page-data-queue-unavailable', expect.any(Object));
  });

  test('permit lists a selectable command per module command', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('permit', null, 0, undefined, 'app-1', 'main');
    const lines = data['lines'] as string[];
    expect(lines.some((line) => line.includes('/health'))).toBe(true);
    // ADR-013 — no version string leaks onto the surface
    expect(lines.every((line) => !line.includes('v1.0.0'))).toBe(true);
  });

  test('dashboard page 0 renders the core command list with icons', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 0, undefined, 'app-1', 'main');
    const lines = data['lines'] as string[];
    // UR-20261011-009 — a module with no declared logo shows the framework FALLBACK logo (📦),
    // not the white-square decoration (which is only for a module page's own command list).
    expect(lines).toContain('📦 `/health`');
    expect(data['pageTotal']).toBe(2);
  });

  test('dashboard page 1 renders the standard module page with its commands, icon and identity', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 1, undefined, 'app-1', 'main');
    // item 4 — the module icon sits beside every module command list, module pages included.
    expect(data['lines']).toEqual(['⬜ `/hello`']);
    // item 7 — the page names its owning module, so the frame resolves THAT module's identity
    // (its banner and footer), not the dashboard's.
    expect(data['pageModuleId']).toBe('hello-world');
    expect(data['pageModuleName']).toBe('Hello World');
  });

  test('dashboard page out of range falls back to the main page', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('dashboard', null, 99, undefined, 'app-1', 'main');
    expect(data['page']).toBe(0);
  });

  test('marketplace lists available modules without an in-content title', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('browse', null, 0, undefined, 'app-1', 'main');
    // item 1 — no in-content "Marketplace" heading (the frame title already names the surface).
    expect(data['title']).toBeUndefined();
    expect(JSON.stringify(data)).toContain('browse');
    expect((data['modules'] as unknown[]).length).toBe(1);
  });

  test('marketplace search filters the available modules by name', async () => {
    const provider = createPageDataProvider(makeDeps());
    const hit = await provider('browse', null, 0, 'brow', 'app-1', 'main');
    expect((hit['modules'] as unknown[]).length).toBe(1);
    const miss = await provider('browse', null, 0, 'zzz', 'app-1', 'main');
    expect((miss['modules'] as unknown[]).length).toBe(0);
  });

  test('marketplace lists a disabled standard module as previously installed (UR-20261011-010)', async () => {
    const statesKnex = ((table: string) => ({
      where: () => ({
        whereNull: () => ({
          select: async (): Promise<unknown[]> =>
            table === 'guild_module_states'
              ? [{ moduleSlug: 'hello-world', enabled: false, state: 'disabled' }]
              : [],
        }),
      }),
    })) as unknown as Dict;
    statesKnex['raw'] = async (): Promise<unknown[]> => [{}];
    const provider = createPageDataProvider(makeDeps({ db: { knex: statesKnex } }));
    const data = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'main');
    const mods = data['modules'] as Array<{ id: string; previouslyInstalled?: boolean }>;
    expect(mods.map((m) => m.id)).toContain('hello-world');
    // item 4 — a STATE, not subtext: the fact goes in the private notice, not under the description.
    expect(mods.find((m) => m.id === 'hello-world')?.previouslyInstalled).toBe(true);
  });

  test('a standard module is NOT enabled by default for a profile that did not get there first', async () => {
    // Q2 — the guild admin adds one bot first; its standard tiers are enabled by default, and a
    // profile added afterwards must not have them by default, standard tier or not, because they are
    // already occupied. Seen from a PERSONA, a standard module the main holds reads as occupied.
    const provider = createPageDataProvider(
      makeDeps({
        resolveOwner: async (_guildId: string, slug: string) =>
          slug === 'hello-world' ? 'main' : undefined,
      }),
    );
    const asPersona = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'persona-1');
    const entries = asPersona['modules'] as Array<{ id: string; occupied?: boolean }>;
    const hello = entries.find((m) => m.id === 'hello-world');
    expect(hello?.occupied).toBe(true);

    // And from the MAIN BOT, its own standard module is NOT occupied — it got there first.
    const asMain = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'main');
    const mine = (asMain['modules'] as Array<{ id: string; occupied?: boolean }>).find(
      (m) => m.id === 'hello-world',
    );
    expect(mine?.occupied).not.toBe(true);
  });

  test('marketplace lists a SHORT main view — the rest is what Discover is for', async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      mod(`mp-${String(i).padStart(2, '0')}`, 'marketplace', ['x']),
    );
    const bigRegistry = {
      all: () => [mod('health', 'core', ['health']), ...many],
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: bigRegistry }));
    const data = await provider('browse', null, 0, undefined, 'app-1', 'main');
    // item 3 — the main view is for "the top few": 15. Everything else is reached through Discover,
    // which is a search rather than a longer page. `total` still reports every match.
    expect((data['modules'] as unknown[]).length).toBe(15);
    expect(data['total']).toBe(30);
  });

  test('marketplace reports none when there are no marketplace modules', async () => {
    const emptyRegistry = {
      all: () => [mod('health', 'core', ['health'])],
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: emptyRegistry }));
    const data = await provider('browse', null, 0, undefined, 'app-1', 'main');
    expect(
      (data['lines'] as string[]).some((line) => line.includes('No marketplace modules')),
    ).toBe(true);
  });

  test('installedModules lists enabled modules (UR-20261011-011)', async () => {
    const provider = createPageDataProvider(makeDeps());
    const data = await provider('modules', null, 0, undefined, 'app-1', 'main');
    expect(data['title']).toBe('Installed Modules');
    // core (health, dashboard) + the default-enabled standard (hello-world); the marketplace
    // module (browse) is not installed, so it is not listed.
    expect((data['modules'] as unknown[]).length).toBe(3);
  });

  test('a DISABLED standard module is EXCLUDED from the installed list (A2.5)', async () => {
    // The /modules report recorded "module is disabled but still listed in the catalogue". The list
    // shows what is ENABLED for the guild, so a disabled standard module must not appear — and this
    // pins it, because the listing is where the defect would reappear.
    const statesKnex = ((table: string) => ({
      where: () => ({
        whereNull: () => ({
          select: async (): Promise<unknown[]> =>
            table === 'guild_module_states'
              ? [{ moduleSlug: 'hello-world', enabled: false, state: 'disabled' }]
              : [],
        }),
      }),
    })) as unknown as Dict;
    statesKnex['raw'] = async (): Promise<unknown[]> => [{}];
    const provider = createPageDataProvider(makeDeps({ db: { knex: statesKnex } }));
    const data = await provider('modules', 'guild-1', 0, undefined, 'app-1', 'main');
    const ids = (data['modules'] as Array<{ id: string }>).map((m) => m.id);
    expect(ids).not.toContain('hello-world');
    // The enabled ones are still there: core is always enabled.
    expect(ids).toContain('health');
  });

  test('a disabled module leaves the installed count and total (A2.5)', async () => {
    const statesKnex = ((table: string) => ({
      where: () => ({
        whereNull: () => ({
          select: async (): Promise<unknown[]> =>
            table === 'guild_module_states'
              ? [{ moduleSlug: 'hello-world', enabled: false, state: 'disabled' }]
              : [],
        }),
      }),
    })) as unknown as Dict;
    statesKnex['raw'] = async (): Promise<unknown[]> => [{}];
    const enabled = await createPageDataProvider(makeDeps())(
      'modules',
      'guild-1',
      0,
      undefined,
      'app-1',
      'main',
    );
    const disabled = await createPageDataProvider(makeDeps({ db: { knex: statesKnex } }))(
      'modules',
      'guild-1',
      0,
      undefined,
      'app-1',
      'main',
    );
    expect(disabled['total']).toBe((enabled['total'] as number) - 1);
  });

  test('a disabled standard module reappears in /browse so it can be re-enabled (A2.5)', async () => {
    const statesKnex = ((table: string) => ({
      where: () => ({
        whereNull: () => ({
          select: async (): Promise<unknown[]> =>
            table === 'guild_module_states'
              ? [{ moduleSlug: 'hello-world', enabled: false, state: 'disabled' }]
              : [],
        }),
      }),
    })) as unknown as Dict;
    statesKnex['raw'] = async (): Promise<unknown[]> => [{}];
    const data = await createPageDataProvider(makeDeps({ db: { knex: statesKnex } }))(
      'browse',
      'guild-1',
    );
    const mods = data['modules'] as Array<{ id: string; previouslyInstalled?: boolean }>;
    expect(mods.map((m) => m.id)).toContain('hello-world');
    expect(mods.find((m) => m.id === 'hello-world')?.previouslyInstalled).toBe(true);
  });

  test('installedModules paginates the module list (UR-20261011-009)', async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      mod(`std-${String(i).padStart(2, '0')}`, 'standard', ['x']),
    );
    const bigRegistry = {
      all: () => many,
    } as unknown as PageDataDeps['moduleRegistry'];
    const provider = createPageDataProvider(makeDeps({ moduleRegistry: bigRegistry }));
    const first = await provider('modules', null, 0, undefined, 'app-1', 'main');
    expect(first['pageTotal']).toBe(3);
    expect((first['modules'] as unknown[]).length).toBe(6);
    const second = await provider('modules', null, 1, undefined, 'app-1', 'main');
    expect(second['page']).toBe(1);
    expect((second['modules'] as unknown[]).length).toBe(6);
    // an out-of-range page clamps to the last page rather than rendering empty
    const clamped = await provider('modules', null, 9, undefined, 'app-1', 'main');
    expect(clamped['page']).toBe(2);
    expect((clamped['modules'] as unknown[]).length).toBe(3);
  });

  test('an unknown module id yields empty page data', async () => {
    const provider = createPageDataProvider(makeDeps());
    expect(await provider('nope', null, 0, undefined, 'app-1', 'main')).toEqual({});
  });
});

describe('module ownership is PER PROFILE (UR-20261012-061)', () => {
  test('a module claimed by a persona is not installed for the main bot, and vice versa', async () => {
    // The operator's report: installing a module in the main bot made it appear as installed for the
    // persona too. Ownership is per profile, first come — one profile holds a module, not the guild.
    const provider = createPageDataProvider(
      makeDeps({
        resolveOwner: async (_guildId: string, slug: string) =>
          slug === 'hello-world' ? 'p-1' : undefined,
      }),
    );
    const namesOf = (d: Dict): string[] => (d['modules'] as Array<{ id: string }>).map((m) => m.id);

    const asMain = await provider('modules', 'guild-1', 0, undefined, 'app-1', 'main');
    const asPersona = await provider('modules', 'guild-1', 0, undefined, 'app-2', 'p-1');

    // hello-world is held by the persona, so the main bot does NOT list it...
    expect(namesOf(asMain)).not.toContain('hello-world');
    // ...and the persona does.
    expect(namesOf(asPersona)).toContain('hello-world');
    // Core is shared: both list it.
    expect(namesOf(asMain)).toContain('health');
    expect(namesOf(asPersona)).toContain('health');
  });

  test('/browse marks a module another profile holds as occupied, and does not offer it', async () => {
    const provider = createPageDataProvider(
      makeDeps({
        resolveOwner: async (_guildId: string, slug: string) =>
          slug === 'hello-world' ? 'p-1' : undefined,
      }),
    );
    const asMain = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'main');
    const entries = asMain['modules'] as Array<{
      id: string;
      occupied?: boolean;
      occupiedBy?: string;
    }>;
    const hello = entries.find((m) => m.id === 'hello-world');
    expect(hello?.occupied).toBe(true);
    expect(hello?.occupiedBy).toBe('another profile');
  });

  test('UR-20261012-079 - a module the MAIN BOT enabled reads as the main bot\u2019s, not a persona\u2019s', async () => {
    // UR-078 made the ownership read answer `'main'` for an enabled-but-unbound module. The occupancy
    // note keyed on `holder === undefined` as a proxy for "the main bot", so the answer inverted: a
    // module the main bot enabled started reading as "Occupied by a persona - the main bot cannot take
    // it". This pins both spellings of "the main bot".
    const provider = createPageDataProvider(
      makeDeps({
        resolveOwner: async (_guildId: string, slug: string) =>
          slug === 'hello-world' ? 'main' : undefined,
      }),
    );
    // Seen from a PERSONA, a module the main bot holds is occupied - and says who holds it.
    const asPersona = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'persona-1');
    const entries = asPersona['modules'] as Array<{
      id: string;
      occupied?: boolean;
      occupiedBy?: string;
    }>;
    const hello = entries.find((m) => m.id === 'hello-world');
    expect(hello?.occupied).toBe(true);
    // item 4 — who holds it is a FIELD, stated in the option's short line and the private notice;
    // the sentence that used to sit under every description is gone.
    // A NAME, not a role.
    expect(hello?.occupiedBy).toBe('Dumby Profile');

    // Seen from the MAIN BOT, its own module is NOT occupied.
    const asMain = await provider('browse', 'guild-1', 0, undefined, 'app-1', 'main');
    const mainEntries = asMain['modules'] as Array<{ id: string; occupied?: boolean }>;
    expect(mainEntries.find((m) => m.id === 'hello-world')?.occupied).toBeUndefined();
  });
});
