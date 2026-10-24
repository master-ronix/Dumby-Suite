import { describe, expect, test } from 'vitest';
import { makeModuleView, registeredModuleIds } from '../../src/module-system/module-view.js';
import type { ModuleRegistry } from '../../src/module-system/registry.js';

/**
 * The derivation is the single source now, so these tests are the contract every surface inherits.
 * The cases are the ones the surfaces disagreed on in production: a module a persona holds while a page
 * still offers it, a disabled module that a count treated as held, and the command registration asking
 * a different question from the pages.
 */

const MAIN = 'main';
const PERSONA = 'persona-A';

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
    get: (name: string) => {
      const m = modules.find((x) => x.name === name);
      return m === undefined
        ? undefined
        : {
            manifest: {
              name: m.name,
              tier: m.tier,
              ...(m.displayName === undefined ? {} : { ui: { displayName: m.displayName } }),
            },
          };
    },
  } as unknown as ModuleRegistry;
}

const build = (over: Partial<Parameters<typeof makeModuleView>[0]> = {}) =>
  makeModuleView({
    moduleRegistry: registryWith([{ name: 'hello-world', tier: 'standard' }]),
    stateForGuild: async () => undefined,
    bindingForGuild: async () => undefined,
    resolveOwner: async () => undefined,
    defaultEnabledForTier: (tier) => tier !== 'marketplace',
    isSharedTier: (tier) => tier === 'core' || tier === 'admin',
    isGuildScopedTier: (tier) => tier === 'standard' || tier === 'marketplace',
    ...over,
  });

describe('module view — one derivation, four answers', () => {
  test("an untouched standard module is ENABLED and the internal profile's, so a persona may not take it", async () => {
    // The rule the operator stated: whichever profile is in the guild first holds the standard modules.
    // The real resolver answers 'main' here — enabled by the tier default, no binding — which is why the
    // stub returns 'main' rather than undefined. Getting that wrong is what let a persona install over
    // the internal profile.
    const [view] = await build({ resolveOwner: async () => MAIN }).viewForGuild('g1', PERSONA);
    expect(view?.enabled).toBe(true); // tier default
    expect(view?.owner).toBe(MAIN);
    expect(view?.heldByMe).toBe(false); // not hers
    expect(view?.registeredForMe).toBe(false); // so she does not serve it
    expect(view?.availableToMe).toBe(false); // and may NOT install over it
  });

  test('and the internal profile DOES hold and serve an untouched standard module', async () => {
    const [view] = await build({ resolveOwner: async () => MAIN }).viewForGuild('g1', MAIN);
    expect(view?.heldByMe).toBe(true);
    expect(view?.registeredForMe).toBe(true);
    expect(view?.availableToMe).toBe(false); // it already holds it
  });

  test('a persona holding it: held, registered, and NOT available to her again', async () => {
    const [view] = await build({
      stateForGuild: async () => ({ enabled: true, state: 'active', enabledBy: PERSONA }),
      bindingForGuild: async () => PERSONA,
      resolveOwner: async () => PERSONA,
    }).viewForGuild('g1', PERSONA);
    expect(view?.owner).toBe(PERSONA);
    expect(view?.heldByMe).toBe(true);
    expect(view?.registeredForMe).toBe(true);
    expect(view?.availableToMe).toBe(false); // there is nothing to install
  });

  test('the SAME module, seen by the internal profile, is neither held nor registered by it', async () => {
    // This is the disagreement that put /hello on the wrong bot: the module was the persona's, and the
    // internal profile's registration asked "is it enabled?" instead of "is it mine?".
    const [view] = await build({
      stateForGuild: async () => ({ enabled: true, state: 'active', enabledBy: PERSONA }),
      bindingForGuild: async () => PERSONA,
      resolveOwner: async () => PERSONA,
    }).viewForGuild('g1', MAIN);
    expect(view?.enabled).toBe(true);
    expect(view?.owner).toBe(PERSONA);
    expect(view?.heldByMe).toBe(false);
    expect(view?.registeredForMe).toBe(false); // the internal profile must NOT serve it
    expect(view?.availableToMe).toBe(false); // and may not install it either
  });

  test('a DISABLED module is held by nobody — not by the internal profile', async () => {
    // The health regression: coercing the resolver's undefined to 'main' made every disabled standard
    // module count as the internal profile's.
    const [view] = await build({
      stateForGuild: async () => ({ enabled: false, state: 'disabled', enabledBy: undefined }),
      resolveOwner: async () => undefined,
    }).viewForGuild('g1', MAIN);
    expect(view?.enabled).toBe(false);
    expect(view?.owner).toBe('none');
    expect(view?.heldByMe).toBe(false);
    expect(view?.registeredForMe).toBe(false);
  });

  test('a disabled module IS available to install, and to either profile', async () => {
    for (const me of [MAIN, PERSONA]) {
      const [view] = await build({
        stateForGuild: async () => ({ enabled: false, state: 'disabled', enabledBy: undefined }),
        resolveOwner: async () => undefined,
      }).viewForGuild('g1', me);
      expect(view?.availableToMe).toBe(true);
    }
  });

  test('a core module is shared: on, held by everyone, registered by everyone, installable by nobody', async () => {
    const [view] = await build({
      moduleRegistry: registryWith([{ name: 'browse', tier: 'core' }]),
    }).viewForGuild('g1', PERSONA);
    expect(view?.owner).toBe('shared');
    expect(view?.enabled).toBe(true);
    expect(view?.heldByMe).toBe(true);
    expect(view?.registeredForMe).toBe(true);
    expect(view?.availableToMe).toBe(false);
  });

  test('a marketplace module with no row is OFF, and available', async () => {
    const [view] = await build({
      moduleRegistry: registryWith([{ name: 'market-thing', tier: 'marketplace' }]),
    }).viewForGuild('g1', PERSONA);
    expect(view?.enabled).toBe(false);
    expect(view?.availableToMe).toBe(true);
    expect(view?.registeredForMe).toBe(false);
  });

  test('a DM has no module state: nothing held, nothing installable', async () => {
    const [view] = await build().viewForGuild(null, PERSONA);
    expect(view?.enabled).toBe(false);
    expect(view?.heldByMe).toBe(false);
    expect(view?.availableToMe).toBe(false);
  });

  test('registeredModuleIds is exactly what a runtime should serve', async () => {
    const views = await build({
      moduleRegistry: registryWith([
        { name: 'browse', tier: 'core' },
        { name: 'hello-world', tier: 'standard' },
      ]),
      stateForGuild: async (_g, m) =>
        m === 'hello-world' ? { enabled: true, state: 'active', enabledBy: PERSONA } : undefined,
      bindingForGuild: async (_g, m) => (m === 'hello-world' ? PERSONA : undefined),
      resolveOwner: async (_g, m) => (m === 'hello-world' ? PERSONA : undefined),
    }).viewForGuild('g1', PERSONA);
    expect(registeredModuleIds(views)).toEqual(['browse', 'hello-world']);
  });
});
