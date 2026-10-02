import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandRegistry, CommandCollisionError } from '../../src/commands/command-registry.js';
import { CommandRouter, CommandScopeDeniedError } from '../../src/commands/command-router.js';
import { MiddlewarePipeline } from '../../src/middleware/middleware-pipeline.js';
import { MiddlewareRejectError, type Middleware } from '../../src/middleware/base-middleware.js';
import { PermissionResolver } from '../../src/permissions/resolver.js';
import { IS_COMPONENTS_V2 } from '../../src/shared/utils/components-v2.js';

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
    reg.register({
      data: { name: 'utility', description: 'Utility' },
      execute: handler,
      moduleId: 'utility',
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

  test('rejects guild-only commands in direct messages by default', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'Health' },
      execute: async () => {},
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);

    await expect(
      router.dispatch({ ...makeInteraction('health'), guildId: null }),
    ).rejects.toBeInstanceOf(CommandScopeDeniedError);
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
    expect(lastEditText(disabled)).toContain('reason: FORBIDDEN');

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
    expect(lastEditText(interaction)).toContain('Dumby | Ping');
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
