import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import type { Knex } from 'knex';
import type { DbClient } from '../../../src/db/client.js';
import type { CacheManager } from '../../../src/cache/cache-manager.js';
import type {
  ModuleRegistry,
  LoadedModule,
  ModuleManifest,
} from '../../../src/module-system/registry.js';
import type { Container } from '../../../src/di/container.js';
import { CORE_TOKENS } from '../../../src/di/tokens.js';

export type Row = Record<string, unknown>;

export interface TableRow {
  [column: string]: unknown;
}

export interface QueryChain<RowT = TableRow> {
  where: (_criteria?: unknown) => QueryChain<RowT>;
  whereNull: (_column: string) => QueryChain<RowT>;
  whereNotNull: (_column: string) => QueryChain<RowT>;
  whereIn: (_column: string, _values: readonly unknown[]) => QueryChain<RowT>;
  orderBy: (_column: string, _dir?: 'asc' | 'desc') => QueryChain<RowT>;
  orderByRaw: (_sql: string) => QueryChain<RowT>;
  limit: (_n: number) => QueryChain<RowT>;
  offset: (_n: number) => QueryChain<RowT>;
  select: (..._columns: string[]) => QueryChain<RowT>;
  groupBy: (..._columns: string[]) => QueryChain<RowT>;
  count: (_col?: string) => QueryChain<RowT>;
  first: <T = RowT>() => Promise<T | undefined>;
  then: <TResult1 = RowT[], TResult2 = never>(
    onfulfilled?: ((value: RowT[]) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((_reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1>;
  catch: <TResult = never>(
    _onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>,
  ) => Promise<RowT[] | TResult>;
  insert: (_row: unknown) => Promise<number[]>;
  update: (_row: unknown) => Promise<number>;
  del: () => Promise<number>;
  delete: () => Promise<number>;
  onConflict: (_columns?: string | readonly string[]) => QueryConflict<RowT>;
}

export interface QueryConflict<RowT = TableRow> {
  merge: () => Promise<RowT[]>;
  ignore: () => Promise<number>;
}

export interface QueryBuilder<RowT = TableRow> extends QueryChain<RowT> {}

export interface HarnessTables {
  [tableName: string]: {
    rows?: TableRow[];
    firstRow?: TableRow;
    countRow?: { count: string };
  };
}

export interface HarnessOptions {
  tables?: HarnessTables;
  cacheGet?: (key: string) => Promise<unknown>;
  cacheSet?: (key: string, value: unknown, ttlMs?: number) => Promise<void>;
  registryAll?: LoadedModule[] | (() => LoadedModule[]);
  registryGet?: (name: string) => LoadedModule | undefined;
}

export interface Harness {
  container: Container;
  db: DbClient;
  cache: CacheManager;
  moduleRegistry: ModuleRegistry;
  knex: Knex;
  knexFn: ReturnType<typeof vi.fn>;
  lastInserted: { current: unknown };
  cacheGetFn: ReturnType<typeof vi.fn>;
  cacheSetFn: ReturnType<typeof vi.fn>;
  registryAllFn: ReturnType<typeof vi.fn>;
  registryGetFn: ReturnType<typeof vi.fn>;
}

export function makeHarness(options: HarnessOptions = {}): Harness {
  const tables = options.tables ?? {};
  const lastInserted: { current: unknown } = { current: undefined };

  const makeQueryChain = (tableName: string): QueryChain => {
    const table = tables[tableName];
    const rows = table?.rows ?? [];
    const chain: QueryChain & { resolvedRows?: TableRow[] } = {
      where: vi.fn((_c?: unknown) => chain as unknown as QueryChain),
      whereNull: vi.fn((_c: string) => chain as unknown as QueryChain),
      whereNotNull: vi.fn((_c: string) => chain as unknown as QueryChain),
      whereIn: vi.fn((_c: string, _v: readonly unknown[]) => chain as unknown as QueryChain),
      orderBy: vi.fn((_c: string, _d?: 'asc' | 'desc') => chain as unknown as QueryChain),
      orderByRaw: vi.fn((_s: string) => chain as unknown as QueryChain),
      limit: vi.fn((_n: number) => chain as unknown as QueryChain),
      offset: vi.fn((_n: number) => chain as unknown as QueryChain),
      select: vi.fn((..._c: string[]) => chain as unknown as QueryChain),
      groupBy: vi.fn((..._c: string[]) => chain as unknown as QueryChain),
      count: vi.fn((_c?: string) => chain as unknown as QueryChain),
      first: vi.fn(async <T = TableRow>() => (table?.firstRow ?? rows[0]) as T | undefined),
      then: vi.fn(
        async <TResult1 = TableRow[], TResult2 = never>(
          onfulfilled?: ((value: TableRow[]) => TResult1 | PromiseLike<TResult1>) | null,
          _onrejected?: ((_reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) => {
          if (onfulfilled) return onfulfilled(rows) as TResult1;
          return (rows ?? []) as unknown as TResult1;
        },
      ),
      catch: vi.fn(
        async <TResult = never>(
          _onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>,
        ): Promise<TableRow[] | TResult> => {
          return (rows ?? []) as TableRow[];
        },
      ),
      insert: vi.fn(async (_row: unknown) => {
        lastInserted.current = _row;
        return [1];
      }),
      update: vi.fn(async () => 1),
      del: vi.fn(async () => 1),
      delete: vi.fn(async () => 1),
      onConflict: vi.fn((_cols?: string | readonly string[]) => ({
        merge: vi.fn(async () => rows),
        ignore: vi.fn(async () => 1),
      })),
      resolvedRows: rows,
    };
    return chain as unknown as QueryChain;
  };

  const knexFake = vi.fn((tableName: string) => makeQueryChain(tableName)) as unknown as Knex;
  const db = { knex: knexFake } as unknown as DbClient;

  const cacheGetSpy = vi.fn(async (key: string) => {
    if (options.cacheGet) return options.cacheGet(key);
    return undefined;
  });
  const cacheSetSpy = vi.fn(async (key: string, value: unknown, ttlMs?: number) => {
    if (options.cacheSet) await options.cacheSet(key, value, ttlMs);
  });
  const cache = {
    get: cacheGetSpy,
    set: cacheSetSpy,
    invalidate: vi.fn(async () => undefined),
    flushNamespace: vi.fn(async () => undefined),
  } as unknown as CacheManager;

  const registryAllSpy = vi.fn((): LoadedModule[] => {
    const seeded = options.registryAll ?? [];
    return (Array.isArray(seeded) ? seeded : []).map((m) => m);
  });
  const registryGetSpy = vi.fn((name: string): LoadedModule | undefined => {
    if (options.registryGet) return options.registryGet(name);
    return registryAllSpy().find((m) => m.manifest.name === name);
  });
  const moduleRegistry = {
    all: registryAllSpy,
    get: registryGetSpy,
    has: vi.fn((name: string) => registryAllSpy().some((m) => m.manifest.name === name)),
    count: vi.fn(() => registryAllSpy().length),
  } as unknown as ModuleRegistry;

  const container = {
    resolve: (token: symbol): unknown => {
      if (token === CORE_TOKENS.Db) return db;
      if (token === CORE_TOKENS.Cache) return cache;
      if (token === CORE_TOKENS.ModuleRegistry) return moduleRegistry;
      throw new Error(`Unexpected token resolved in harness: ${String(token)}`);
    },
  } as unknown as Container;

  return {
    container,
    db,
    cache,
    moduleRegistry,
    knex: knexFake,
    knexFn: knexFake,
    lastInserted,
    cacheGetFn: cacheGetSpy,
    cacheSetFn: cacheSetSpy,
    registryAllFn: registryAllSpy,
    registryGetFn: registryGetSpy,
  };
}

export function makeManifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    name: 'core',
    displayName: 'Core',
    version: '1.0.0',
    description: 'Core test module',
    tier: 'core',
    hardcoded: false,
    devId: 'dev_first_party',
    buildId: 'build_test_1_0_0',
    visibility: 'public',
    releaseStatus: 'public',
    required: true,
    commands: [],
    ...overrides,
  } as ModuleManifest;
}

export function makeLoadedModule(
  manifest: ModuleManifest,
  lifecycles: Partial<Omit<LoadedModule, 'manifest'>> = {},
): LoadedModule {
  return { manifest, ...lifecycles };
}

export function makeLoadedMod(
  manifest: ModuleManifest,
  lifecycles: Partial<Omit<LoadedModule, 'manifest'>> = {},
): LoadedModule {
  return makeLoadedModule(manifest, lifecycles);
}

export { randomUUID };
