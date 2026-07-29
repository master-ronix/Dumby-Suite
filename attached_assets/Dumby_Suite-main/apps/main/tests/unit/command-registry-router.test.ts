import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { CommandRegistry, CommandCollisionError } from '../../src/commands/command-registry.js';
import { CommandRouter, CommandNotFoundError } from '../../src/commands/command-router.js';

// ─── CommandRegistry ──────────────────────────────────────────────────────────

describe('CommandRegistry', () => {
  test('starts with zero commands', () => {
    const reg = new CommandRegistry();
    expect(reg.count()).toBe(0);
  });

  test('registers a command and retrieves it by name', () => {
    const reg = new CommandRegistry();
    const handler = vi.fn();
    reg.register({ data: { name: 'ping', description: 'Ping' }, execute: handler, moduleId: 'core' });
    const cmd = reg.get('ping');
    expect(cmd).toBeDefined();
    expect(cmd?.moduleId).toBe('core');
  });

  test('has() returns true for registered command', () => {
    const reg = new CommandRegistry();
    reg.register({ data: { name: 'ping', description: 'Ping' }, execute: vi.fn(), moduleId: 'core' });
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
    reg.register({ data: { name: 'health', description: 'Health check' }, execute: vi.fn(), moduleId: 'core' });
    const payloads = reg.toApiPayloads();
    expect(payloads[0]?.name).toBe('health');
  });

  test('throws CommandCollisionError on duplicate command name', () => {
    const reg = new CommandRegistry();
    reg.register({ data: { name: 'health', description: 'H' }, execute: vi.fn(), moduleId: 'core' });
    expect(() =>
      reg.register({ data: { name: 'health', description: 'H2' }, execute: vi.fn(), moduleId: 'other' })
    ).toThrow(CommandCollisionError);
  });

  test('CommandCollisionError includes both module names', () => {
    const reg = new CommandRegistry();
    reg.register({ data: { name: 'health', description: 'H' }, execute: vi.fn(), moduleId: 'core' });
    try {
      reg.register({ data: { name: 'health', description: 'H2' }, execute: vi.fn(), moduleId: 'other' });
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
  return { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), child: vi.fn() };
}

function makeInteraction(name = 'health') {
  return {
    commandName: name,
    user: { id: 'u1' },
    guildId: 'g1',
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn(),
    editReply: vi.fn(),
  };
}

describe('CommandRouter', () => {
  test('dispatches to the registered handler', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.register({ data: { name: 'health', description: 'H' }, execute: handler, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await router.dispatch(makeInteraction('health'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('throws CommandNotFoundError for an unregistered command', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await expect(router.dispatch(makeInteraction('nonexistent'))).rejects.toBeInstanceOf(CommandNotFoundError);
  });

  test('logs a warning for an unknown command', async () => {
    const reg = new CommandRegistry();
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    try { await router.dispatch(makeInteraction('ghost')); } catch {}
    expect(logger.warn).toHaveBeenCalled();
  });

  test('logs command-executed after a successful dispatch', async () => {
    const reg = new CommandRegistry();
    reg.register({ data: { name: 'hello', description: 'H' }, execute: async () => {}, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await router.dispatch(makeInteraction('hello'));
    expect(logger.info).toHaveBeenCalledWith('command-executed', expect.any(Object));
  });

  test('logs command-execution-error and rethrows when handler throws', async () => {
    const reg = new CommandRegistry();
    reg.register({ data: { name: 'bad', description: 'H' }, execute: async () => { throw new Error('boom'); }, moduleId: 'core' });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    await expect(router.dispatch(makeInteraction('bad'))).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalled();
  });
});
