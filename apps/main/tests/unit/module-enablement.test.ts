import { test, expect, describe, vi } from 'vitest';
import { makeModuleEnablement } from '../../src/module-system/enablement.js';
import type { ModuleRegistry } from '../../src/module-system/registry.js';

/**
 * UR-20261012-069 — the ONE enablement read. §13.4: `guild_module_states` is the single source of
 * truth, and a per-guild row is an OVERRIDE on the tier default (§13.2: a Standard module is enabled
 * by default). Every gate must agree on that, so it is pinned here once.
 */

function registryWith(tier: string | undefined) {
  return {
    get: (moduleId: string) =>
      tier === undefined ? undefined : { manifest: { name: moduleId, tier } },
  } as unknown as ModuleRegistry;
}

/** A knex stub whose `first`/`select` resolve to the rows we hand it. */
function knexWith(rows: Array<{ enabled?: unknown; state?: unknown }>, throwOnRead = false) {
  const chain = {
    where: () => chain,
    whereNull: () => chain,
    first: async () => {
      if (throwOnRead) throw new Error('database unavailable');
      return rows[0];
    },
    select: async () => {
      if (throwOnRead) throw new Error('database unavailable');
      return rows;
    },
  };
  return (() => chain) as never;
}

const logger = () => ({ warn: vi.fn() }) as never;

describe('makeModuleEnablement (UR-20261012-069)', () => {
  test('a CORE module is always enabled for a guild, without reading a row', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([{ enabled: false, state: 'disabled' }]),
      moduleRegistry: registryWith('core'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledForGuild('g1', 'dashboard')).toBe(true);
  });

  test('a per-guild row is an OVERRIDE', async () => {
    const e = makeModuleEnabledRow({ enabled: false, state: 'disabled' }, 'standard');
    expect(await e.isModuleEnabledForGuild('g1', 'hello-world')).toBe(false);
  });

  test('a row that is enabled AND active is enabled', async () => {
    const e = makeModuleEnabledRow({ enabled: true, state: 'active' }, 'standard');
    expect(await e.isModuleEnabledForGuild('g1', 'hello-world')).toBe(true);
  });

  test('a row enabled but NOT active is not enabled', async () => {
    const e = makeModuleEnabledRow({ enabled: true, state: 'suspended' }, 'standard');
    expect(await e.isModuleEnabledForGuild('g1', 'hello-world')).toBe(false);
  });

  test('an ABSENT row falls back to the tier default — a Standard module is enabled', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([]),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledForGuild('g1', 'hello-world')).toBe(true);
  });

  test('a null guild (a DM) is never enabled', async () => {
    const e = makeModuleEnabledRow({ enabled: true, state: 'active' }, 'standard');
    expect(await e.isModuleEnabledForGuild(null, 'hello-world')).toBe(false);
  });

  test('a FAILING read falls back to the tier default rather than throwing', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([], true),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledForGuild('g1', 'hello-world')).toBe(true);
  });

  test('an unknown module is treated as marketplace (not default-enabled)', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([]),
      moduleRegistry: registryWith(undefined),
      logger: logger(),
    });
    expect(await e.isModuleEnabledForGuild('g1', 'mystery')).toBe(false);
  });

  test('anywhere: Core is always wanted', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([{ enabled: false, state: 'disabled' }]),
      moduleRegistry: registryWith('core'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledAnywhere('dashboard')).toBe(true);
  });

  test('anywhere: true when SOME guild wants it', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([
        { enabled: false, state: 'disabled' },
        { enabled: true, state: 'active' },
      ]),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledAnywhere('hello-world')).toBe(true);
  });

  test('anywhere: false when EVERY guild has disabled it', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([
        { enabled: false, state: 'disabled' },
        { enabled: false, state: 'disabled' },
      ]),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledAnywhere('hello-world')).toBe(false);
  });

  test('anywhere: no rows at all falls back to the tier default', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([]),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledAnywhere('hello-world')).toBe(true);
  });

  test('anywhere: a FAILING read falls back to the tier default', async () => {
    const e = makeModuleEnablement({
      knex: knexWith([], true),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });
    expect(await e.isModuleEnabledAnywhere('hello-world')).toBe(true);
  });
});

function makeModuleEnabledRow(row: { enabled?: unknown; state?: unknown }, tier: string) {
  return makeModuleEnablement({
    knex: knexWith([row]),
    moduleRegistry: registryWith(tier),
    logger: logger(),
  });
}

describe('enabledByForGuild — WHO holds the module', () => {
  const make = (rows: Array<{ enabledBy?: unknown; enabled?: unknown }>, throwOnRead = false) =>
    makeModuleEnablement({
      knex: knexWith(rows as never, throwOnRead),
      moduleRegistry: registryWith('standard'),
      logger: logger(),
    });

  test('the enabling profile is returned', async () => {
    // Ownership could not derive this: "is it enabled?" cannot tell the main's install from a
    // persona's, which is why a persona's own install came back as the main's.
    expect(
      await make([{ enabled: true, enabledBy: 'persona-9' }]).enabledByForGuild('g1', 'm'),
    ).toBe('persona-9');
  });

  test('the main is returned as the main', async () => {
    expect(await make([{ enabled: true, enabledBy: 'main' }]).enabledByForGuild('g1', 'm')).toBe(
      'main',
    );
  });

  test('a DISABLED module is held by nobody, whatever the column still says', async () => {
    expect(
      await make([{ enabled: false, enabledBy: 'persona-9' }]).enabledByForGuild('g1', 'm'),
    ).toBeUndefined();
  });

  test('no row at all is held by nobody', async () => {
    expect(await make([]).enabledByForGuild('g1', 'm')).toBeUndefined();
  });

  test('a row predating the column answers undefined rather than guessing a profile', async () => {
    expect(await make([{ enabled: true }]).enabledByForGuild('g1', 'm')).toBeUndefined();
    expect(
      await make([{ enabled: true, enabledBy: '' }]).enabledByForGuild('g1', 'm'),
    ).toBeUndefined();
    expect(
      await make([{ enabled: true, enabledBy: 7 }]).enabledByForGuild('g1', 'm'),
    ).toBeUndefined();
  });

  test('a null guild (a DM) is never held', async () => {
    expect(
      await make([{ enabled: true, enabledBy: 'persona-9' }]).enabledByForGuild(null, 'm'),
    ).toBeUndefined();
  });

  test('a failed read answers undefined and says so', async () => {
    const log = { warn: vi.fn() };
    const e = makeModuleEnablement({
      knex: knexWith([], true),
      moduleRegistry: registryWith('standard'),
      logger: log as never,
    });
    expect(await e.enabledByForGuild('g1', 'm')).toBeUndefined();
    expect(log.warn).toHaveBeenCalled();
  });
});
