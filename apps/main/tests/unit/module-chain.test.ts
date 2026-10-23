import { describe, expect, test, vi } from 'vitest';
import { makeModuleChain } from '../../src/module-system/module-chain.js';
import type { ModuleRegistry } from '../../src/module-system/registry.js';

/**
 * The chain exists to be READ when the rows disagree. These tests hand it rows that disagree and
 * assert it reports them raw rather than resolving them away — a diagnostic that tidies up its inputs
 * cannot show you what is wrong.
 */

function registryWith(modules: Array<{ name: string; tier: string; displayName?: string }>) {
  return {
    all: () =>
      modules.map((m) => ({
        manifest: {
          name: m.name,
          tier: m.tier,
          ...(m.displayName === undefined ? {} : { ui: { displayName: m.displayName } }),
        },
      })),
  } as unknown as ModuleRegistry;
}

/** A knex stub keyed by table name. */
function knexWith(rows: Record<string, Array<Record<string, unknown>>>) {
  const chain = (table: string) => {
    const self = {
      where: () => self,
      whereNull: () => self,
      select: async () => rows[table] ?? [],
      first: async () => (rows[table] ?? [])[0],
    };
    return self;
  };
  return chain as never;
}

const logger = () => ({ warn: vi.fn() }) as never;

const build = (over: Partial<Parameters<typeof makeModuleChain>[0]> = {}) =>
  makeModuleChain({
    knex: knexWith({}),
    moduleRegistry: registryWith([{ name: 'hello-world', tier: 'standard' }]),
    resolveOwner: async () => undefined,
    listPersonaStatus: async () => new Map(),
    logger: logger(),
    ...over,
  });

describe('module chain — the whole decision, raw', () => {
  test('a module nobody holds reads as the main, with no state and no binding', async () => {
    const [entry] = await build().chainForGuild('g1');
    expect(entry?.moduleId).toBe('hello-world');
    expect(entry?.state).toBeNull();
    expect(entry?.binding).toBeNull();
    expect(entry?.owner).toBe('main');
  });

  test('the rows are reported AS THEY ARE, even when they disagree', async () => {
    // This is the shape of every bug in this area: the state says one profile enabled it, the binding
    // names another, and the resolved owner says a third. The chain shows all three.
    const chain = build({
      knex: knexWith({
        guild_module_states: [
          { moduleSlug: 'hello-world', enabled: true, state: 'active', enabledBy: 'persona-A' },
        ],
        guild_persona_bindings: [{ moduleSlug: 'hello-world', personaId: 'persona-B' }],
      }),
      resolveOwner: async () => 'persona-C',
      listPersonaStatus: async () => new Map([['persona-C', 'active']]),
    });
    const [entry] = await chain.chainForGuild('g1');
    expect(entry?.state?.enabledBy).toBe('persona-A');
    expect(entry?.binding?.personaId).toBe('persona-B');
    expect(entry?.owner).toBe('persona-C');
    expect(entry?.ownerStatus).toBe('active');
  });

  test('a disabled module is reported as disabled, keeping its enabler column visible', async () => {
    const chain = build({
      knex: knexWith({
        guild_module_states: [
          { moduleSlug: 'hello-world', enabled: false, state: 'disabled', enabledBy: null },
        ],
      }),
      resolveOwner: async () => undefined,
    });
    const [entry] = await chain.chainForGuild('g1');
    expect(entry?.state?.enabled).toBe(false);
    expect(entry?.state?.state).toBe('disabled');
    expect(entry?.state?.enabledBy).toBeUndefined();
  });

  test("a module's build state is reported, so the marketplace side is visible too", async () => {
    const chain = build({
      knex: knexWith({
        builds: [
          {
            moduleSlug: 'hello-world',
            buildId: 'b-1',
            version: '1.2.0',
            validationStatus: 'passed',
            promotedAt: '2026-10-01T00:00:00Z',
          },
        ],
      }),
    });
    const [entry] = await chain.chainForGuild('g1');
    expect(entry?.build?.version).toBe('1.2.0');
    expect(entry?.build?.validationStatus).toBe('passed');
  });

  test('a read that fails is reported, not swallowed — the rest of the chain still returns', async () => {
    const log = { warn: vi.fn() };
    const chain = makeModuleChain({
      knex: (() => {
        throw new Error('database unavailable');
      }) as never,
      moduleRegistry: registryWith([{ name: 'hello-world', tier: 'standard' }]),
      resolveOwner: async () => undefined,
      listPersonaStatus: async () => new Map(),
      logger: log as never,
    });
    const entries = await chain.chainForGuild('g1');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.state).toBeNull();
    expect(log.warn).toHaveBeenCalled();
  });

  test('the display name is preferred when the module declares one', async () => {
    const chain = build({
      moduleRegistry: registryWith([
        { name: 'hello-world', tier: 'standard', displayName: 'Hello World' },
      ]),
    });
    const [entry] = await chain.chainForGuild('g1');
    expect(entry?.displayName).toBe('Hello World');
  });
});
