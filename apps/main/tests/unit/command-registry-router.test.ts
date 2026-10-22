import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandRegistry, CommandCollisionError } from '../../src/commands/command-registry.js';
import { CommandRouter } from '../../src/commands/command-router.js';
import { MiddlewarePipeline } from '../../src/middleware/middleware-pipeline.js';
import { MiddlewareRejectError, type Middleware } from '../../src/middleware/base-middleware.js';
import { PermissionResolver } from '../../src/permissions/resolver.js';
import { IS_COMPONENTS_V2 } from '../../src/shared/utils/components-v2.js';
import { registerModuleEmoji } from '../../src/rendering/module-icons.js';

function textContents(payload: unknown): string[] {
  const msg = payload as { components?: Array<{ components?: unknown[] }> } | undefined;
  if (msg === undefined || !Array.isArray(msg.components)) return [];
  const out: string[] = [];
  const walk = (components: unknown[]): void => {
    for (const component of components) {
      const comp = component as {
        type?: number;
        content?: string;
        components?: unknown[];
      };
      if (comp.type === 10 && typeof comp.content === 'string') out.push(comp.content);
      if (Array.isArray(comp.components)) walk(comp.components);
    }
  };
  for (const component of msg.components) {
    const comp = component as { components?: unknown[] };
    if (Array.isArray(comp.components)) walk(comp.components);
    else walk([component]);
  }
  return out;
}

function lastEditReply(interaction: { editReply: ReturnType<typeof vi.fn> }): unknown {
  const calls = interaction.editReply.mock.calls;
  return calls.length > 0 ? (calls[calls.length - 1]?.[0] as unknown) : undefined;
}

function lastEditText(interaction: { editReply: ReturnType<typeof vi.fn> }): string {
  return textContents(lastEditReply(interaction)).join('\n');
}

function firstReply(interaction: { reply: ReturnType<typeof vi.fn> }): unknown {
  return interaction.reply.mock.calls[0]?.[0] as unknown;
}

describe('CommandRegistry', () => {
  test('starts with zero commands', () => {
    const reg = new CommandRegistry();
    expect(reg.count()).toBe(0);
  });

  test('registers a command and retrieves it by name', () => {
    const reg = new CommandRegistry();
    const handler = vi.fn();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'ping', description: 'Ping' },
      execute: handler,
      moduleId: 'core',
    });
    const cmd = reg.get('ping');
    expect(cmd).toBeDefined();
    expect(cmd?.moduleId).toBe('core');
  });

  test('stores module tier separately from command definitions', () => {
    const reg = new CommandRegistry();
    const handler = vi.fn();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'ping', description: 'Ping' },
      execute: handler,
      moduleId: 'core',
    });
    const cmd = reg.get('ping');
    expect(cmd).toBeDefined();
    expect(cmd).not.toHaveProperty('tier');
    expect(cmd ? reg.tierForCommand(cmd) : undefined).toBe('core');
  });

  test('has() returns true for registered command', () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'ping', description: 'Ping' },
      execute: vi.fn(),
      moduleId: 'core',
    });
    expect(reg.has('ping')).toBe(true);
  });

  test('has() returns false for unregistered command', () => {
    const reg = new CommandRegistry();
    expect(reg.has('nonexistent')).toBe(false);
  });

  test('get() returns undefined for unknown command', () => {
    const reg = new CommandRegistry();
    expect(reg.get('nonexistent')).toBeUndefined();
  });

  test('all() returns all registered commands', () => {
    const reg = new CommandRegistry();
    reg.registerModule('m1', 'core');
    reg.registerModule('m2', 'core');
    reg.register({ data: { name: 'a', description: 'A' }, execute: vi.fn(), moduleId: 'm1' });
    reg.register({ data: { name: 'b', description: 'B' }, execute: vi.fn(), moduleId: 'm2' });
    expect(reg.all().length).toBe(2);
  });

  test('toApiPayloads() returns the REST-ready JSON for each command', () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'health', description: 'Health check' },
      execute: vi.fn(),
      moduleId: 'core',
    });
    const payloads = reg.toApiPayloads();
    expect(payloads[0]?.name).toBe('health');
  });

  test('throws CommandCollisionError on duplicate command name', () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.registerModule('other', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: vi.fn(),
      moduleId: 'core',
    });
    expect(() =>
      reg.register({
        data: { name: 'health', description: 'H2' },
        execute: vi.fn(),
        moduleId: 'other',
      }),
    ).toThrow(CommandCollisionError);
  });

  test('CommandCollisionError includes both module names', () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.registerModule('other', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: vi.fn(),
      moduleId: 'core',
    });
    try {
      reg.register({
        data: { name: 'health', description: 'H2' },
        execute: vi.fn(),
        moduleId: 'other',
      });
      expect.fail('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CommandCollisionError);
      expect((err as Error).message).toContain('core');
      expect((err as Error).message).toContain('other');
    }
  });
});

function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
}

function makeInteraction(name = 'health') {
  return {
    commandName: name,
    user: { id: 'u1' },
    guildId: 'g1',
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CommandRouter', () => {
  test('dispatches to the registered handler', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await router.dispatch(makeInteraction('health'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('dispatches registered handlers through the middleware pipeline', async () => {
    const reg = new CommandRegistry();
    const calls: string[] = [];
    const handler = vi.fn().mockImplementation(async () => {
      calls.push('handler');
    });
    const stage: Middleware = {
      priority: 0,
      execute: async (ctx, next) => {
        calls.push(`${ctx.commandName}:before`);
        await next();
        calls.push(`${ctx.commandName}:after`);
      },
    };
    const pipeline = new MiddlewarePipeline().add(stage);
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, { middlewarePipeline: pipeline });

    await router.dispatch(makeInteraction('health'));

    expect(calls).toEqual(['health:before', 'handler', 'health:after']);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('renders the buffer then a formal notice when middleware rejects dispatch', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    const stage: Middleware = {
      priority: 0,
      execute: async () => {
        throw new MiddlewareRejectError(403, 'Denied by policy', false);
      },
    };
    const pipeline = new MiddlewarePipeline().add(stage);
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const interaction = makeInteraction('health');
    const router = new CommandRouter(reg, logger, { middlewarePipeline: pipeline });

    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect((firstReply(interaction) as { flags?: number }).flags).toBe(IS_COMPONENTS_V2);
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('reason: FORBIDDEN');
  });

  test('invokes the configured permission resolver on every dispatch', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    const permissionResolver = {
      resolve: vi.fn().mockReturnValue({ allowed: true }),
    } as unknown as PermissionResolver;
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      permissionResolver,
      botOwnerIds: ['owner-1'],
    });

    await router.dispatch(makeInteraction('health'));

    expect(permissionResolver.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'core',
        actorId: 'u1',
        guildId: 'g1',
        botOwnerIds: ['owner-1'],
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('renders a FORBIDDEN notice when the permission resolver denies dispatch', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('utility', 'standard');
    // UR-20261012-047 — this used to rely on the removed "no explicit permission declaration" deny,
    // which was not a layer and denied every core command in production. The denial is now forced the
    // legitimate way: the command declares a Discord permission the member does not hold, so Layer 5
    // refuses it and the FORBIDDEN notice still renders.
    reg.register({
      data: { name: 'utility', description: 'Utility' },
      execute: handler,
      moduleId: 'utility',
      permissions: { discord: ['BAN_MEMBERS'] },
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      permissionResolver: new PermissionResolver(),
      botOwnerIds: ['owner-1'],
      isModuleEnabledInGuild: async () => true,
    });

    const interaction = makeInteraction('utility');
    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('reason: FORBIDDEN');
  });

  test('a guild permit grant allows a module command even without a permission declaration', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue('Pong');
    reg.registerModule('moderation', 'standard');
    reg.register({
      data: { name: 'ban', description: 'B' },
      execute: handler,
      moduleId: 'moderation',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      permissionResolver: new PermissionResolver(),
      guildGrants: [
        { guildId: 'g1', level: 'role', refId: 'role-1', type: 'permit', key: 'moderation.ban' },
      ],
    });

    const interaction = { ...makeInteraction('ban'), memberRoles: ['role-1'] };
    await router.dispatch(interaction);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('Pong');
  });

  test('a guild blacklist grant renders a FORBIDDEN notice for the targeted member', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue('Pong');
    reg.registerModule('moderation', 'standard');
    reg.register({
      data: { name: 'ban', description: 'B' },
      execute: handler,
      moduleId: 'moderation',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      permissionResolver: new PermissionResolver(),
      isModuleEnabledInGuild: async () => true,
      guildGrants: [
        { guildId: 'g1', level: 'role', refId: 'role-1', type: 'blacklist', key: 'moderation.ban' },
      ],
    });

    const interaction = { ...makeInteraction('ban'), memberRoles: ['role-1'] };
    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(lastEditText(interaction)).toContain('reason: FORBIDDEN');
  });

  test('core commands are never subject to guild Layer 7 grants', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue('Healthy');
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'health',
      permissionDeclared: true,
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      permissionResolver: new PermissionResolver(),
      guildGrants: [
        { guildId: 'g1', level: 'role', refId: 'role-1', type: 'blacklist', key: 'health.health' },
      ],
    });

    const interaction = { ...makeInteraction('health'), memberRoles: ['role-1'] };
    await router.dispatch(interaction);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('Healthy');
  });

  test('ANSWERS a direct-message invocation with a refusal (UR-20261012-058)', async () => {
    // It used to THROW before replying, so Discord showed "The application did not respond" — which
    // tells the member nothing. DM use is prohibited by design; the refusal says so.
    const reg = new CommandRegistry();
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'Health' },
      execute: async () => {},
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = { ...makeInteraction('health'), guildId: null };

    await expect(router.dispatch(interaction)).resolves.toBeUndefined();
    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify(interaction.reply.mock.calls[0]?.[0]);
    expect(sent).toContain('Direct messages are not supported');
    expect(sent).toContain('prohibited');
  });

  test('renders an UNKNOWN_COMMAND notice for an unregistered command', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('nonexistent');

    await router.dispatch(interaction);

    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('reason: UNKNOWN_COMMAND');
  });

  test('logs a warning for an unknown command', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    try {
      await router.dispatch(makeInteraction('ghost'));
    } catch {}
    expect(logger.warn).toHaveBeenCalled();
  });

  test('logs command-executed after a successful dispatch', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'hello', description: 'H' },
      execute: async () => {},
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await router.dispatch(makeInteraction('hello'));
    expect(logger.info).toHaveBeenCalledWith('command-executed', expect.any(Object));
  });

  test('renders a MODULE_ERROR notice and logs when handler throws', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'bad', description: 'H' },
      execute: async () => {
        throw new Error('boom');
      },
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('bad');

    await router.dispatch(interaction);

    expect(logger.error).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('reason: MODULE_ERROR');
  });

  test('allows admin commands only in the configured development guild', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('ops', 'admin');
    reg.register({
      data: { name: 'ops', description: 'Admin' },
      execute: handler,
      moduleId: 'ops',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, { devGuildId: 'dev-guild' });

    const denied = makeInteraction('ops');
    await router.dispatch(denied);
    expect(handler).not.toHaveBeenCalled();
    expect(lastEditText(denied)).toContain('reason: FORBIDDEN');

    const allowed = { ...makeInteraction('ops'), guildId: 'dev-guild' };
    await router.dispatch(allowed);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(allowed)).toContain('Done.');
  });

  test('checks guild module state for standard and marketplace commands', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('utility', 'standard');
    reg.register({
      data: { name: 'utility', description: 'Utility' },
      execute: handler,
      moduleId: 'utility',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      isModuleEnabledInGuild: async (_moduleId, guildId) => guildId === 'enabled-guild',
    });

    const disabled = makeInteraction('utility');
    await router.dispatch(disabled);
    expect(handler).not.toHaveBeenCalled();
    // UR-20261012-074 — a DISABLED module reports as such, not as a permission failure. This
    // assertion previously pinned FORBIDDEN, which is the confusion the operator reported live.
    expect(lastEditText(disabled)).toContain('reason: MODULE_DISABLED');

    const enabled = { ...makeInteraction('utility'), guildId: 'enabled-guild' };
    await router.dispatch(enabled);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('sends the buffer then edits it into the final render once', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue('Pong');
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'ping', description: 'P' },
      execute: handler,
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('ping');

    await router.dispatch(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).toHaveBeenCalledTimes(1);
    expect((firstReply(interaction) as { flags?: number }).flags).toBe(IS_COMPONENTS_V2);
    expect(lastEditText(interaction)).toContain('Pong');
    expect(lastEditText(interaction)).toContain('Dumby Suite | Ping');
  });

  test('maps a handler returning nothing to a Done final render', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('core', 'core');
    reg.register({
      data: { name: 'touch', description: 'T' },
      execute: handler,
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('touch');

    await router.dispatch(interaction);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(interaction)).toContain('Done.');
  });

  test('guarantees an OVERDUE notice while a handler runs past the follow-up alarm', async () => {
    vi.useFakeTimers();
    try {
      const reg = new CommandRegistry();
      let release!: () => void;
      let released!: Promise<void>;
      released = new Promise<void>((resolve) => {
        release = resolve;
      });
      reg.registerModule('core', 'core');
      reg.register({
        data: { name: 'slow', description: 'Slow command' },
        execute: async () => {
          await released;
          return 'late';
        },
        moduleId: 'core',
      });
      const logger = makeLogger() as unknown as Logger;
      const router = new CommandRouter(reg, logger, { followupAlarmMs: 60_000 });
      const interaction = makeInteraction('slow');
      const dispatch = router.dispatch(interaction);

      await vi.advanceTimersByTimeAsync(60_000);
      expect(lastEditText(interaction)).toContain('reason: OVERDUE');

      release();
      await dispatch;

      expect(lastEditText(interaction)).toContain('late');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a persona is bound to ONE guild (UR-20261012-060)', () => {
  test('refuses every command in a guild it is not bound to', async () => {
    // A persona registers core commands GLOBALLY, so her commands are visible in servers she does not
    // serve. Every one of them must be refused there.
    const reg = new CommandRegistry();
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'Health' },
      execute: async () => {},
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      residentPersonaId: 'p-1',
      residentBoundGuildId: 'g-bound',
    });
    const elsewhere = makeInteraction('health'); // guildId 'g1', which is NOT 'g-bound'

    await expect(router.dispatch(elsewhere)).resolves.toBeUndefined();
    const sent = JSON.stringify(elsewhere.editReply.mock.calls.at(-1)?.[0]);
    expect(sent).toContain('not my server');
  });

  test('acts normally in its own bound guild', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('health', 'core');
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.register({
      data: { name: 'health', description: 'Health' },
      execute: handler,
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      residentPersonaId: 'p-1',
      residentBoundGuildId: 'g1',
    });

    await router.dispatch(makeInteraction('health'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('/browse states module occupancy (UR-20261012-061)', () => {
  test('an occupied module carries a status MARK and a described note, and a free one does not', async () => {
    // item 3 — occupancy is a status mark beside the description, not a "(occupied)" suffix on the
    // name. Register the mark so the listing can be asserted to carry it.
    registerModuleEmoji('dumby_occupied', '4242', '');
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      residentPersonaId: 'p-1',
      residentApplicationId: 'app-2',
      pageDataProvider: async () => ({
        query: '',
        modules: [
          {
            id: 'hello-world',
            name: 'hello-world',
            description: 'A hello module',
            icon: '🧊',
            occupied: true,
            occupiedBy: 'the main bot',
            note: 'Occupied by the main bot in this server — a persona cannot take it',
          },
          { id: 'free-mod', name: 'free-mod', description: 'Free', icon: '🆓' },
        ],
      }),
    });

    const rendered = JSON.stringify(await router.buildBrowseRender('u1', 'g1', ''));

    // item 2 — the STATUS MARK is the option's emoji (the one place Discord renders a custom emoji in
    // a select), and the description states the tier and the state in words.
    expect(rendered).toContain('dumby_occupied');
    expect(rendered).toContain('Standard · occupied by the main bot');
    expect(rendered).not.toContain('hello-world — occupied');
    // The description is not repeated in the option — that was the duplication.
    expect(rendered.split('A hello module').length - 1).toBe(1);
    // The free module is offered normally.
    expect(rendered).toContain('free-mod');
  });

  test('a browse render survives a provider that returns nothing', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, { pageDataProvider: async () => ({}) });
    // The empty path must still render a frame rather than throw.
    await expect(router.buildBrowseRender('u1', 'g1', 'nothing')).resolves.toBeDefined();
  });
});

const logger2 = makeLogger() as unknown as Logger;

describe('a module can tell WHO it is running as (UR-20261012-067)', () => {
  /** The context a handler actually receives. */
  const captureContext = (reg: CommandRegistry, seen: { ctx?: unknown }) => {
    reg.register({
      data: { name: 'whoami', description: 'Who am I' },
      execute: async (_i: unknown, context: unknown) => {
        seen.ctx = context;
        return { page: 'whoami', data: {} };
      },
      moduleId: 'hello-world',
    } as never);
  };

  test('a persona dispatch carries its identity, application, binding and ownership', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const seen: { ctx?: unknown } = {};
    captureContext(reg, seen);
    const router = new CommandRouter(reg, logger2, {
      residentPersonaId: 'p-1',
      residentBoundGuildId: 'g-bound',
      residentProfileName: 'ELSA',
      resolveCommandOwner: async () => 'p-1',
      isModuleEnabledInGuild: async () => true,
    } as never);
    // A persona acts only in its bound guild, so the dispatch must come from there.
    const interaction = {
      ...makeInteraction('whoami'),
      applicationId: 'app-elsa',
      guildId: 'g-bound',
    };

    await router.dispatch(interaction);

    const ctx = seen.ctx as {
      identity: Record<string, unknown>;
      module: Record<string, unknown>;
    };
    expect(ctx.identity['kind']).toBe('persona');
    expect(ctx.identity['profileId']).toBe('p-1');
    expect(ctx.identity['profileName']).toBe('ELSA');
    // The application is the one Discord states on the interaction — never a second source.
    expect(ctx.identity['applicationId']).toBe('app-elsa');
    expect(ctx.identity['boundGuildId']).toBe('g-bound');
    expect(ctx.module['moduleId']).toBe('hello-world');
    expect(ctx.module['owner']).toBe('p-1');
    expect(ctx.module['ownedByCaller']).toBe(true);
  });

  test('the main bot carries no bound guild, and sees a module it holds as its own', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const seen: { ctx?: unknown } = {};
    captureContext(reg, seen);
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: async () => undefined, // unbound: the main bot holds it
      isModuleEnabledInGuild: async () => true,
    } as never);

    await router.dispatch({ ...makeInteraction('whoami'), applicationId: 'app-main' });

    const ctx = seen.ctx as { identity: Record<string, unknown>; module: Record<string, unknown> };
    expect(ctx).toBeDefined();
    expect(ctx.identity['kind']).toBe('main');
    expect(ctx.identity['profileId']).toBe('main');
    // The main bot serves every guild it is installed in, so it declares no bound guild.
    expect(ctx.identity['boundGuildId']).toBeUndefined();
    expect(ctx.module['owner']).toBe('main');
    expect(ctx.module['ownedByCaller']).toBe(true);
  });

  test('the main bot ANSWERS a module a persona holds — ownership gates the install, not the answer', async () => {
    // "Go practical": a module that is on for the guild, whose command is REGISTERED for this
    // application, is a module this profile may answer. Refusing here produced FORBIDDEN for a module
    // the operator had installed and enabled, which reads as a permissions bug. The refusal lives at
    // the INSTALL, where it already is.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const seen: { ctx?: unknown } = {};
    captureContext(reg, seen);
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: async () => 'p-1',
      isModuleEnabledInGuild: async () => true,
    } as never);

    await router.dispatch({ ...makeInteraction('whoami'), applicationId: 'app-main' });

    // Answered, and the context says who it is running as.
    expect(seen.ctx).toBeDefined();
  });
});
describe('a failing lookup refuses HONESTLY, it does not break the dispatch (UR-20261012-069)', () => {
  test('a throwing ownership lookup yields the unreadable-state notice, not a fake permission error', async () => {
    // This path runs on EVERY command. A failing read must not propagate as an unhandled error, and it
    // must not be reported as "not available in guild" — that tells a member they lack permission when
    // the truth is that the guild's state could not be read.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const seen: { ctx?: unknown } = {};
    reg.register({
      data: { name: 'whoami', description: 'Who am I' },
      execute: async (_i: unknown, context: unknown) => {
        seen.ctx = context;
        return { page: 'whoami', data: {} };
      },
      moduleId: 'hello-world',
    } as never);
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: async () => {
        throw new Error('database unavailable');
      },
      isModuleEnabledInGuild: async () => true,
    } as never);
    const interaction = { ...makeInteraction('whoami'), applicationId: 'app-main' };

    await expect(router.dispatch(interaction)).resolves.toBeUndefined();
    expect(seen.ctx).toBeUndefined();
    const notice = JSON.stringify(interaction.editReply.mock.calls.at(-1)?.[0]);
    expect(notice).toContain('Could not check this server');
    expect(notice).not.toContain('is not available in guild');
  });
});

describe('the standing is advisory — it can never break a dispatch (UR-20261012-068)', () => {
  test('a failing owner read yields the CONSERVATIVE owner, not a throw', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: async () => {
        throw new Error('database unavailable');
      },
      isModuleEnabledInGuild: async () => true,
    } as never);
    // Reached directly: on the live path the assertions run first, so a throw here would be the
    // SECOND read failing — a transient fault. Either way the standing must not throw.
    const standing = await (
      router as unknown as {
        moduleStanding: (
          def: unknown,
          interaction: unknown,
        ) => Promise<{ owner: string; enabled: boolean }>;
      }
    ).moduleStanding({ moduleId: 'hello-world' }, { guildId: 'g1' });

    expect(standing.owner).toBe('main');
    expect(standing.enabled).toBe(true);
  });

  test('a failing enablement read yields enabled:false — claim nothing, never a false yes', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: async () => 'main',
      isModuleEnabledInGuild: async () => {
        throw new Error('database unavailable');
      },
    } as never);
    const standing = await (
      router as unknown as {
        moduleStanding: (
          def: unknown,
          interaction: unknown,
        ) => Promise<{ owner: string; enabled: boolean }>;
      }
    ).moduleStanding({ moduleId: 'hello-world' }, { guildId: 'g1' });

    expect(standing.enabled).toBe(false);
    expect(standing.owner).toBe('main');
  });

  test('a Core module is shared and always enabled, without reading either dep', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('dashboard', 'core');
    const ownerRead = vi.fn(async () => 'someone');
    const enabledRead = vi.fn(async () => false);
    const router = new CommandRouter(reg, logger2, {
      resolveCommandOwner: ownerRead,
      isModuleEnabledInGuild: enabledRead,
    } as never);
    const standing = await (
      router as unknown as {
        moduleStanding: (
          def: unknown,
          interaction: unknown,
        ) => Promise<{ owner: string; enabled: boolean }>;
      }
    ).moduleStanding({ moduleId: 'dashboard' }, { guildId: 'g1' });

    expect(standing.owner).toBe('shared');
    expect(standing.enabled).toBe(true);
    expect(ownerRead).not.toHaveBeenCalled();
    expect(enabledRead).not.toHaveBeenCalled();
  });
});

describe('a DISABLED module is not a permission problem (UR-20261012-074)', () => {
  test('a module-disabled refusal says so, instead of "your permissions do not allow this"', async () => {
    // Reported from a live server: `/dashboard` was refused with reason FORBIDDEN, so the member was
    // told they lacked permission when the truth was that the module was switched off in that guild.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    reg.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: async () => ({ page: 'hello', data: {} }),
    } as never);
    const router = new CommandRouter(reg, logger2, {
      isModuleEnabledInGuild: async () => false,
    } as never);
    const interaction = { ...makeInteraction('hello'), applicationId: 'app-main' };

    await expect(router.dispatch(interaction)).resolves.toBeUndefined();
    const notice = JSON.stringify(interaction.editReply.mock.calls.at(-1)?.[0]);
    expect(notice).toContain('This module is switched off');
    expect(notice).toContain('not a permissions problem');
    expect(notice).not.toContain('Your permissions do not allow this action');
  });
});

describe('the primary render carries the acting profile (UR-20261012-075)', () => {
  test('a persona dispatch renders the page for the PERSONA, not the main bot', async () => {
    // The dispatcher defaulted actingProfileId to 'main', so a persona's FIRST page reported the main
    // bot's modules — while the same page after an effect (which did pass it) reported its own. Two
    // renders of one page disagreed.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    reg.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: async () => ({ page: 'hello', data: {} }),
    } as never);
    const seen: Array<{ applicationId?: string; actingProfileId?: string }> = [];
    const router = new CommandRouter(reg, logger2, {
      isModuleEnabledInGuild: async () => true,
      residentPersonaId: 'persona-1',
      pageDataProvider: async (
        _moduleId: string,
        _guildId: string | null,
        _page: number,
        _query: string | undefined,
        applicationId: string,
        actingProfileId: string,
      ) => {
        seen.push({ applicationId, actingProfileId });
        return {};
      },
    } as never);
    const interaction = { ...makeInteraction('hello'), applicationId: 'app-persona' };

    await router.dispatch(interaction);

    expect(seen.length).toBeGreaterThan(0);
    for (const call of seen) {
      expect(call.actingProfileId).toBe('persona-1');
      expect(call.applicationId).toBe('app-persona');
    }
  });

  test('the main bot renders for main', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    reg.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: async () => ({ page: 'hello', data: {} }),
    } as never);
    const seen: Array<string | undefined> = [];
    const router = new CommandRouter(reg, logger2, {
      isModuleEnabledInGuild: async () => true,
      pageDataProvider: async (
        _m: string,
        _g: string | null,
        _p: number,
        _q: string | undefined,
        _a: string,
        actingProfileId: string,
      ) => {
        seen.push(actingProfileId);
        return {};
      },
    } as never);

    await router.dispatch({ ...makeInteraction('hello'), applicationId: 'app-main' });

    expect(seen.every((id) => id === 'main')).toBe(true);
  });
});

describe('a persona may run SHARED commands (UR-20261012-080)', () => {
  test('a CORE command is not treated as owned by the main bot', async () => {
    // UR-078 made the ownership read answer 'main' for any enabled module with no binding. Core
    // modules have no binding and are ALWAYS enabled, so every core command read as the main bot's
    // and a persona was refused all of them: /dashboard, /modules, /browse, /persona, /permit,
    // /queue, /health. §13.2: "Core is `shared`: no profile owns it, every profile runs it."
    const reg = new CommandRegistry();
    reg.registerModule('dashboard', 'core');
    const executed = vi.fn(async () => ({ page: 'dashboard', data: {} }));
    reg.register({
      data: { name: 'dashboard', description: 'Dashboard' },
      moduleId: 'dashboard',
      execute: executed,
    } as never);
    const router = new CommandRouter(reg, logger2, {
      isModuleEnabledInGuild: async () => true,
      // What the real read now answers for a shared tier.
      resolveCommandOwner: async () => 'shared',
      residentPersonaId: 'persona-1',
    } as never);

    const interaction = { ...makeInteraction('dashboard'), applicationId: 'app-persona' };
    await router.dispatch(interaction);

    expect(executed).toHaveBeenCalledTimes(1);
  });

  test('a persona ANSWERS a standard module the main bot holds', async () => {
    // Same rule from the other side. Registration is what keeps a guild from having two bots answer
    // one command: the deployer registers a guild-scoped module only for the profile that holds it.
    const reg = new CommandRegistry();
    reg.registerModule('hello-world', 'standard');
    const executed = vi.fn(async () => ({ page: 'hello', data: {} }));
    reg.register({
      data: { name: 'hello', description: 'Says hello' },
      moduleId: 'hello-world',
      execute: executed,
    } as never);
    const router = new CommandRouter(reg, logger2, {
      isModuleEnabledInGuild: async () => true,
      resolveCommandOwner: async () => 'main',
      residentPersonaId: 'persona-1',
    } as never);

    const interaction = { ...makeInteraction('hello'), applicationId: 'app-persona' };
    await router.dispatch(interaction);

    expect(executed).toHaveBeenCalled();
  });
});
