import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandRegistry, CommandCollisionError } from '../../src/commands/command-registry.js';
import {
  CommandRouter,
  CommandNotFoundError,
  CommandScopeDeniedError,
} from '../../src/commands/command-router.js';

// ─── CommandRegistry ──────────────────────────────────────────────────────────

describe('CommandRegistry', () => {
  test('starts with zero commands', () => {
    const reg = new CommandRegistry();
    expect(reg.count()).toBe(0);
  });

  test('registers a command and retrieves it by name', () => {
    const reg = new CommandRegistry();
    const handler = vi.fn();
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
    reg.register({ data: { name: 'a', description: 'A' }, execute: vi.fn(), moduleId: 'm1' });
    reg.register({ data: { name: 'b', description: 'B' }, execute: vi.fn(), moduleId: 'm2' });
    expect(reg.all().length).toBe(2);
  });

  test('toApiPayloads() returns the REST-ready JSON for each command', () => {
    const reg = new CommandRegistry();
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

// ─── CommandRouter ────────────────────────────────────────────────────────────

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

  test('throws CommandNotFoundError for an unregistered command', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await expect(router.dispatch(makeInteraction('nonexistent'))).rejects.toBeInstanceOf(
      CommandNotFoundError,
    );
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

  test('logs command-execution-error and rethrows when handler throws', async () => {
    const reg = new CommandRegistry();
    reg.register({
      data: { name: 'bad', description: 'H' },
      execute: async () => {
        throw new Error('boom');
      },
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await expect(router.dispatch(makeInteraction('bad'))).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalled();
  });

  test('allows admin commands only in the configured development guild', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('ops', 'admin');
    reg.register({
      data: { name: 'ops', description: 'Admin' },
      execute: async () => {},
      moduleId: 'ops',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, { devGuildId: 'dev-guild' });

    await expect(router.dispatch(makeInteraction('ops'))).rejects.toBeInstanceOf(
      CommandScopeDeniedError,
    );
    await expect(
      router.dispatch({ ...makeInteraction('ops'), guildId: 'dev-guild' }),
    ).resolves.toBeUndefined();
  });

  test('checks guild module state for standard and marketplace commands', async () => {
    const reg = new CommandRegistry();
    reg.registerModule('utility', 'standard');
    reg.register({
      data: { name: 'utility', description: 'Utility' },
      execute: async () => {},
      moduleId: 'utility',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger, {
      isModuleEnabledInGuild: async (_moduleId, guildId) => guildId === 'enabled-guild',
    });

    await expect(router.dispatch(makeInteraction('utility'))).rejects.toBeInstanceOf(
      CommandScopeDeniedError,
    );
    await expect(
      router.dispatch({ ...makeInteraction('utility'), guildId: 'enabled-guild' }),
    ).resolves.toBeUndefined();
  });

  test('auto-defers slow handlers and maps a later reply to editReply', async () => {
    vi.useFakeTimers();
    try {
      const reg = new CommandRegistry();
      let continueHandler: (() => void) | undefined;
      reg.register({
        data: { name: 'slow', description: 'Slow command' },
        execute: async (interaction: unknown) => {
          await new Promise<void>((resolve) => {
            continueHandler = resolve;
          });
          await (interaction as { reply: (options: unknown) => Promise<void> }).reply({
            content: 'done',
          });
        },
        moduleId: 'core',
      });
      const logger = makeLogger() as unknown as Logger;
      const router = new CommandRouter(reg, logger, { ackTimeoutMs: 25 });
      const interaction = makeInteraction('slow');
      const dispatch = router.dispatch(interaction);

      await vi.advanceTimersByTimeAsync(25);
      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      continueHandler?.();
      await dispatch;

      expect(interaction.reply).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith({ content: 'done' });
    } finally {
      vi.useRealTimers();
    }
  });
});
