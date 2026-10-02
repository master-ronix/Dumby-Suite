import { describe, expect, test, vi } from 'vitest';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter } from '../../src/commands/command-router.js';
import { MiddlewarePipeline } from '../../src/middleware/middleware-pipeline.js';
import { DeferMiddleware } from '../../src/middleware/built-in/defer.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * Finding #17 — `createMiddlewareContext` returned `meta: {}`, but `DeferMiddleware` reads the
 * interaction from `ctx.meta['interaction']`, so the defer stage was dead by construction.
 */
describe('M9 finding #17 — the defer stage is live', () => {
  test('a command that requires defer is deferred by the pipeline', async () => {
    const registry = new CommandRegistry();
    registry.registerModule('core', 'core');
    registry.register({
      data: { name: 'defer-me', description: 'D' },
      execute: async () => undefined,
      moduleId: 'core',
      permissionDeclared: true,
    });

    const deferReply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      commandName: 'defer-me',
      user: { id: 'u1' },
      guildId: 'g1',
      replied: false,
      deferred: false,
      reply: vi.fn().mockResolvedValue(undefined),
      deferReply,
      editReply: vi.fn().mockResolvedValue(undefined),
    };

    const pipeline = new MiddlewarePipeline().add(
      new DeferMiddleware({ requiresDefer: () => true, isEphemeral: () => false }),
    );
    const router = new CommandRouter(registry, createLogger('error'), {
      devGuildId: 'dev',
      middlewarePipeline: pipeline,
    });

    await router.dispatch(interaction);

    expect(deferReply).toHaveBeenCalled();
  });
});
