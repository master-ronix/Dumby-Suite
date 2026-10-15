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

  test("'main' cannot collide with a persona id, which is a UUID", async () => {
    const service = serviceWith({ enabled: true });
    const owner = await service.resolveCommandOwner('g1', 'hello-world');
    expect(owner).toBe('main');
    expect(owner).not.toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('the main bot is not refused its own module (UR-20261012-078)', () => {
  test('a persona is refused a module the main bot owns', async () => {
    // The refusal itself is correct and unchanged; what changed is that the MAIN BOT is no longer
    // refused alongside it, because its own id is 'main' and its residentPersonaId is undefined.
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
    expect(executed).not.toHaveBeenCalled();
  });
});
