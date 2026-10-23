import { test, expect, describe, vi } from 'vitest';
import { PersonaCommandBindingService } from '../../src/personas/persona-command-binding.service.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter } from '../../src/commands/command-router.js';

/**
 * UR-20261012-078 — the main bot's ownership.
 *
 * The claim branch in the install path is PERSONA-ONLY, so only the main bot ever enables a module
 * nobody claimed. The operator's rule is that such a module "is the property of the main bot only" —
 * but the ownership read answered `undefined` for it, so a persona could later claim what the main bot
 * had enabled. Three callers already papered over that with `?? 'main'`; the read now states it once.
 */

const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() });

function serviceWith(
  over: {
    binding?: { personaId: string } | undefined;
    enabled?: boolean | undefined;
    throws?: boolean;
  } = {},
) {
  const bindings = {
    findLive: async () => over.binding,
    listForGuild: async () => [],
    bind: async () => undefined,
    unbind: async () => undefined,
    listForPersona: async () => [],
  };
  const identities = { findById: async () => undefined, list: async () => [] };
  const enabledRead =
    over.enabled === undefined
      ? undefined
      : async () => {
          if (over.throws === true) throw new Error('database unavailable');
          return over.enabled as boolean;
        };
  return new PersonaCommandBindingService(
    identities as never,
    bindings as never,
    logger() as never,
    undefined,
    enabledRead as never,
  );
}

describe('the ownership read answers for the main bot (UR-20261012-078)', () => {
  test('a persona binding answers first', async () => {
    const service = serviceWith({ binding: { personaId: 'persona-1' }, enabled: true });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBe('persona-1');
  });

  test('an ENABLED module with no binding belongs to the main bot', async () => {
    const service = serviceWith({ enabled: true });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBe('main');
  });

  test('a DISABLED module with no binding belongs to nobody', async () => {
    const service = serviceWith({ enabled: false });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });

  test('with no enablement read the answer is UNANSWERED, never a guess', async () => {
    const service = serviceWith({});
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });

  test('a failing enablement read leaves it unanswered rather than claiming it', async () => {
    const service = serviceWith({ enabled: true, throws: true });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });

  test('a claim lasts only while the module is INSTALLED — disabling releases it', async () => {
    // The permanent claim: she disabled the module, the binding survived, the other profile's install
    // was refused as "occupied" forever, and NEITHER profile registered the command.
    const service = serviceWith({ binding: { personaId: 'persona-1' }, enabled: false });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });

  test('with no enablement read the claim STANDS — it is never guessed away', async () => {
    const service = serviceWith({ binding: { personaId: 'persona-1' }, enabled: undefined });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBe('persona-1');
  });

  test('a FAILING enablement read keeps the claim, and says so', async () => {
    // Handing the module to the other profile on a failed read would leave two profiles each
    // believing they own it.
    const service = serviceWith({ binding: { personaId: 'persona-1' }, throws: true });
    expect(await service.resolveCommandOwner('g1', 'hello-world')).toBe('persona-1');
  });

  test("'main' cannot collide with a persona id, which is a UUID", async () => {
    const service = serviceWith({ enabled: true });
    const owner = await service.resolveCommandOwner('g1', 'hello-world');
    expect(owner).toBe('main');
    expect(owner).not.toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('the main bot is not refused its own module (UR-20261012-078)', () => {
  test('a persona ANSWERS a module the main bot owns', async () => {
    // "Go practical": the refusal moved to the INSTALL. A module that is on for the guild, and whose
    // command is registered for this application, is one this profile may answer.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const executed = vi.fn(async () => ({ page: 'hello', data: {} }));
    reg.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: executed,
    } as never);
    const router = new CommandRouter(
      reg,
      logger() as never,
      {
        isModuleEnabledInGuild: async () => true,
        resolveCommandOwner: async () => 'main',
        residentPersonaId: 'persona-1',
      } as never,
    );

    const interaction = {
      commandName: 'hello',
      guildId: 'g1',
      user: { id: 'u1' },
      applicationId: 'app-persona',
      reply: async () => undefined,
      deferReply: async () => undefined,
      editReply: async () => undefined,
      replied: false,
      deferred: false,
    };
    await router.dispatch(interaction as never);
    expect(executed).toHaveBeenCalled();
  });
});

describe('ownership is decided by WHO enabled it', () => {
  const make = (enabledBy: string | undefined, enabled = true) =>
    new PersonaCommandBindingService(
      { list: async () => [], findByApplicationId: async () => undefined } as never,
      {
        findLive: async () => undefined,
        listForPersona: async () => [],
        unbind: async () => undefined,
        listForGuild: async () => [],
      } as never,
      {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      } as never,
      undefined,
      async () => enabled,
      (slug: string) => (slug === 'hello-world' ? 'standard' : undefined),
      async () => enabledBy,
    );

  test("a persona's install is HERS — not the main's", async () => {
    // Before this, the read could only ask "is it enabled?" and then assume the main, so a module the
    // persona had just installed appeared under the main's profile.
    expect(await make('persona-9').resolveCommandOwner('g1', 'hello-world')).toBe('persona-9');
  });

  test("the main's install is the main's", async () => {
    expect(await make('main').resolveCommandOwner('g1', 'hello-world')).toBe('main');
  });

  test('a DISABLED module is held by nobody, whatever else is on record', async () => {
    expect(await make('persona-9', false).resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });

  test('core and admin stay SHARED, never a profile', async () => {
    const svc = make('persona-9');
    const withTiers = new PersonaCommandBindingService(
      { list: async () => [], findByApplicationId: async () => undefined } as never,
      {
        findLive: async () => undefined,
        listForPersona: async () => [],
        unbind: async () => undefined,
        listForGuild: async () => [],
      } as never,
      {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      } as never,
      undefined,
      async () => true,
      () => 'core',
      async () => 'persona-9',
    );
    expect(await withTiers.resolveCommandOwner('g1', 'browse')).toBe('shared');
    expect(svc).toBeDefined();
  });
});

describe('the ownership read survives every unreadable input', () => {
  const log = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    debug: () => undefined,
  };
  const identities = { list: async () => [], findByApplicationId: async () => undefined };
  const bindings = (live: unknown) => ({
    findLive: async () => live,
    listForPersona: async () => [],
    unbind: async () => undefined,
    listForGuild: async () => [],
  });
  const build = (opts: {
    live?: unknown;
    enabled?: () => Promise<boolean>;
    enabledBy?: () => Promise<string | undefined>;
    tier?: string;
  }) =>
    new PersonaCommandBindingService(
      identities as never,
      bindings(opts.live) as never,
      log as never,
      undefined,
      opts.enabled,
      () => (opts.tier as never) ?? undefined,
      opts.enabledBy,
    );

  test('a row predating the column falls back to the BINDING', async () => {
    // No enabler recorded — the binding is the only evidence, and it is honoured.
    const svc = build({ live: { personaId: 'persona-9' }, enabled: async () => true });
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBe('persona-9');
  });

  test("and with no binding either, an enabled module is the MAIN's", async () => {
    const svc = build({ enabled: async () => true });
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBe('main');
  });

  test('an unreadable enablement keeps the binding rather than handing the module over', async () => {
    const svc = build({
      live: { personaId: 'persona-9' },
      enabled: async () => {
        throw new Error('db down');
      },
    });
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBe('persona-9');
  });

  test('an unreadable ENABLER falls through rather than refusing', async () => {
    const svc = build({
      live: { personaId: 'persona-9' },
      enabled: async () => true,
      enabledBy: async () => {
        throw new Error('db down');
      },
    });
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBe('persona-9');
  });

  test('with no enablement read wired at all, the binding still answers', async () => {
    const svc = build({ live: { personaId: 'persona-9' } });
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBe('persona-9');
  });

  test('and with nothing wired, ownership is unanswered rather than guessed', async () => {
    const svc = build({});
    expect(await svc.resolveCommandOwner('g1', 'hello-world')).toBeUndefined();
  });
});
