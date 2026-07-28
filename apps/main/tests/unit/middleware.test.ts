/**
 * Tests for the MiddlewarePipeline and all 12 built-in middleware stages.
 */
import { test, expect, vi, describe } from 'vitest';
import type { Logger } from '../../src/logging/logger.js';
import { MiddlewarePipeline } from '../../src/middleware/middleware-pipeline.js';
import { MiddlewareRejectError } from '../../src/middleware/base-middleware.js';
import type { MiddlewareContext } from '../../src/middleware/base-middleware.js';

import { TraceMiddleware } from '../../src/middleware/built-in/trace.js';
import { AuthMiddleware } from '../../src/middleware/built-in/auth.js';
import { MaintenanceModeMiddleware, InMemoryMaintenanceModeState } from '../../src/middleware/built-in/maintenance-mode.js';
import { GuildConfigMiddleware } from '../../src/middleware/built-in/guild-config.js';
import { LocaleMiddleware, DefaultLocaleResolver } from '../../src/middleware/built-in/locale.js';
import { RateLimitMiddleware } from '../../src/middleware/built-in/rate-limit.js';
import { PermissionMiddleware } from '../../src/middleware/built-in/permission.js';
import { RBACMiddleware } from '../../src/middleware/built-in/rbac.js';
import { CooldownMiddleware, InMemoryCooldownStore } from '../../src/middleware/built-in/cooldown.js';
import { DeferMiddleware } from '../../src/middleware/built-in/defer.js';
import { AnalyticsMiddleware } from '../../src/middleware/built-in/analytics.js';

function makeCtx(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  return {
    userId: 'user-1',
    guildId: 'guild-1',
    commandName: 'health',
    correlationId: null,
    meta: {},
    ...overrides,
  };
}

function makeLogger() {
  return {
    trace: vi.fn(), debug: vi.fn(), info: vi.fn(),
    warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), child: vi.fn(),
  };
}

// ─── MiddlewarePipeline ───────────────────────────────────────────────────────

describe('MiddlewarePipeline', () => {
  test('calls the handler when no middleware is registered', async () => {
    const pipeline = new MiddlewarePipeline();
    let ran = false;
    const result = await pipeline.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
    expect(result.ok).toBe(true);
  });

  test('executes middleware in ascending priority order', async () => {
    const order: number[] = [];
    const pipeline = new MiddlewarePipeline();
    pipeline.add({ priority: 30, execute: async (_c, n) => { order.push(30); await n(); } });
    pipeline.add({ priority: 10, execute: async (_c, n) => { order.push(10); await n(); } });
    pipeline.add({ priority: 20, execute: async (_c, n) => { order.push(20); await n(); } });
    await pipeline.execute(makeCtx(), async () => { order.push(99); });
    expect(order).toStrictEqual([10, 20, 30, 99]);
  });

  test('returns ok:false with rejection when a middleware throws MiddlewareRejectError', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.add({
      priority: 0,
      execute: async () => { throw new MiddlewareRejectError(403, 'forbidden'); },
    });
    const result = await pipeline.execute(makeCtx(), async () => {});
    expect(result.ok).toBe(false);
    expect(result.rejection?.statusCode).toBe(403);
    expect(result.rejection?.reason).toBe('forbidden');
    expect(result.rejection?.silent).toBe(false);
  });

  test('returns ok:false with error when an unexpected error escapes', async () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.add({
      priority: 0,
      execute: async () => { throw new Error('boom'); },
    });
    const result = await pipeline.execute(makeCtx(), async () => {});
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  test('sorted() returns stages in ascending priority order without mutating', () => {
    const pipeline = new MiddlewarePipeline();
    pipeline.add({ priority: 50, execute: async (_c, n) => n() });
    pipeline.add({ priority: 10, execute: async (_c, n) => n() });
    const sorted = pipeline.sorted();
    expect(sorted[0]?.priority).toBe(10);
    expect(sorted[1]?.priority).toBe(50);
  });

  test('a rejecting middleware prevents later stages and the handler from running', async () => {
    let handlerRan = false;
    let laterRan = false;
    const pipeline = new MiddlewarePipeline();
    pipeline.add({ priority: 0, execute: async () => { throw new MiddlewareRejectError(429, 'too many'); } });
    pipeline.add({ priority: 10, execute: async (_c, n) => { laterRan = true; await n(); } });
    await pipeline.execute(makeCtx(), async () => { handlerRan = true; });
    expect(handlerRan).toBe(false);
    expect(laterRan).toBe(false);
  });
});

// ─── AdminTierGateMiddleware ──────────────────────────────────────────────────

import { AdminTierGateMiddleware } from '../../src/middleware/built-in/admin-tier-gate.js';

describe('AdminTierGateMiddleware', () => {
  const logger = makeLogger() as unknown as Logger;
  const config = {
    botOwnerIds: ['owner-1', 'owner-2'] as readonly string[],
    isAdminTierCommand: (name: string) => name.startsWith('core-admin'),
  };

  test('allows a non-admin-tier command for any user', async () => {
    const mw = new AdminTierGateMiddleware(config, logger);
    let ran = false;
    await mw.execute(makeCtx({ commandName: 'health', userId: 'random-user' }), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('allows an admin-tier command for a bot owner', async () => {
    const mw = new AdminTierGateMiddleware(config, logger);
    let ran = false;
    await mw.execute(makeCtx({ commandName: 'core-admin-eval', userId: 'owner-1' }), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('silently rejects an admin-tier command for a non-owner (throws MiddlewareRejectError with silent=true)', async () => {
    const mw = new AdminTierGateMiddleware(config, logger);
    try {
      await mw.execute(makeCtx({ commandName: 'core-admin-eval', userId: 'random-user' }), async () => {});
      expect.fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(MiddlewareRejectError);
      expect((err as MiddlewareRejectError).silent).toBe(true);
      expect((err as MiddlewareRejectError).statusCode).toBe(403);
    }
  });

  test('logs a warning on silent rejection', async () => {
    const mw = new AdminTierGateMiddleware(config, logger);
    try { await mw.execute(makeCtx({ commandName: 'core-admin-ban', userId: 'outsider' }), async () => {}); } catch {}
    expect(logger.warn).toHaveBeenCalledWith('admin-tier-gate-reject', expect.any(Object));
  });

  test('has priority -10', () => {
    expect(new AdminTierGateMiddleware(config, logger).priority).toBe(-10);
  });
});

// ─── TraceMiddleware ──────────────────────────────────────────────────────────

describe('TraceMiddleware', () => {
  test('sets correlationId on the context', async () => {
    const mw = new TraceMiddleware();
    const ctx = makeCtx();
    let nextCalled = false;
    await mw.execute(ctx, async () => { nextCalled = true; });
    expect(ctx.correlationId).not.toBeNull();
    expect(typeof ctx.correlationId).toBe('string');
    expect(nextCalled).toBe(true);
  });

  test('sets traceStart in meta', async () => {
    const mw = new TraceMiddleware();
    const ctx = makeCtx();
    await mw.execute(ctx, async () => {});
    expect(typeof ctx.meta['traceStart']).toBe('number');
  });

  test('has priority 0', () => {
    expect(new TraceMiddleware().priority).toBe(0);
  });
});

// ─── AuthMiddleware ───────────────────────────────────────────────────────────

describe('AuthMiddleware', () => {
  const guildOnlyMeta = { isGuildOnly: (name: string) => name === 'guild-cmd' };

  test('allows DM for non-guild-only command', async () => {
    const mw = new AuthMiddleware(guildOnlyMeta);
    const ctx = makeCtx({ guildId: null, commandName: 'dm-cmd' });
    let ran = false;
    await mw.execute(ctx, async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('rejects DM for a guild-only command', async () => {
    const mw = new AuthMiddleware(guildOnlyMeta);
    const ctx = makeCtx({ guildId: null, commandName: 'guild-cmd' });
    await expect(mw.execute(ctx, async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('allows guild interaction for a guild-only command', async () => {
    const mw = new AuthMiddleware(guildOnlyMeta);
    const ctx = makeCtx({ guildId: 'guild-1', commandName: 'guild-cmd' });
    let ran = false;
    await mw.execute(ctx, async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('has priority 10', () => {
    expect(new AuthMiddleware(guildOnlyMeta).priority).toBe(10);
  });
});

// ─── MaintenanceModeMiddleware ────────────────────────────────────────────────

describe('MaintenanceModeMiddleware', () => {
  test('passes through when maintenance mode is inactive', async () => {
    const state = new InMemoryMaintenanceModeState();
    const mw = new MaintenanceModeMiddleware(state);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('rejects all commands when maintenance mode is active', async () => {
    const state = new InMemoryMaintenanceModeState();
    state.activate();
    const mw = new MaintenanceModeMiddleware(state);
    await expect(mw.execute(makeCtx({ commandName: 'any' }), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('allows commands on the allow-list when maintenance is active', async () => {
    const state = new InMemoryMaintenanceModeState(['core-admin-disable-maintenance']);
    state.activate();
    const mw = new MaintenanceModeMiddleware(state);
    let ran = false;
    await mw.execute(makeCtx({ commandName: 'core-admin-disable-maintenance' }), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('has priority -20', () => {
    expect(new MaintenanceModeMiddleware(new InMemoryMaintenanceModeState()).priority).toBe(-20);
  });

  test('InMemoryMaintenanceModeState activate/deactivate', () => {
    const state = new InMemoryMaintenanceModeState(['exempt']);
    expect(state.isActive()).toBe(false);
    state.activate();
    expect(state.isActive()).toBe(true);
    state.deactivate();
    expect(state.isActive()).toBe(false);
    expect(state.allowedCommands()).toContain('exempt');
  });
});

// ─── GuildConfigMiddleware ────────────────────────────────────────────────────

describe('GuildConfigMiddleware', () => {
  const logger = makeLogger() as unknown as Logger;

  test('loads guild config into meta on success', async () => {
    const loader = { load: vi.fn().mockResolvedValue({ prefix: '!' }) };
    const mw = new GuildConfigMiddleware(loader, logger);
    const ctx = makeCtx({ guildId: 'g1' });
    await mw.execute(ctx, async () => {});
    expect(ctx.meta['guildConfig']).toStrictEqual({ prefix: '!' });
  });

  test('degrades to empty config on load failure', async () => {
    const loader = { load: vi.fn().mockRejectedValue(new Error('DB down')) };
    const mw = new GuildConfigMiddleware(loader, logger);
    const ctx = makeCtx({ guildId: 'g1' });
    let ran = false;
    await mw.execute(ctx, async () => { ran = true; });
    expect(ctx.meta['guildConfig']).toStrictEqual({});
    expect(ran).toBe(true);
  });

  test('skips load for DM interactions (no guildId)', async () => {
    const loader = { load: vi.fn() };
    const mw = new GuildConfigMiddleware(loader, logger);
    const ctx = makeCtx({ guildId: null });
    await mw.execute(ctx, async () => {});
    expect(loader.load).not.toHaveBeenCalled();
  });

  test('has priority 20', () => {
    expect(new GuildConfigMiddleware({ load: vi.fn() }, logger).priority).toBe(20);
  });
});

// ─── LocaleMiddleware ─────────────────────────────────────────────────────────

describe('LocaleMiddleware', () => {
  test('sets locale in meta from the resolver', async () => {
    const resolver = new DefaultLocaleResolver('fr-FR');
    const mw = new LocaleMiddleware(resolver);
    const ctx = makeCtx();
    await mw.execute(ctx, async () => {});
    expect(ctx.meta['locale']).toBe('fr-FR');
  });

  test('DefaultLocaleResolver returns the default locale', () => {
    expect(new DefaultLocaleResolver('en-US').resolve(null, 'u1')).toBe('en-US');
  });

  test('has priority 30', () => {
    expect(new LocaleMiddleware(new DefaultLocaleResolver()).priority).toBe(30);
  });
});

// ─── RateLimitMiddleware ──────────────────────────────────────────────────────

describe('RateLimitMiddleware', () => {
  const config = { userMax: 5, userWindowMs: 10_000, guildMax: 50, guildWindowMs: 10_000 };

  test('passes through when both user and guild limits are within bounds', async () => {
    const limiter = { checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0 }) };
    const mw = new RateLimitMiddleware(limiter as never, config);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
    expect(limiter.checkAndIncrement).toHaveBeenCalledTimes(2); // user + guild
  });

  test('rejects when the user limit is exceeded', async () => {
    const limiter = { checkAndIncrement: vi.fn().mockResolvedValue({ allowed: false, retryAfterMs: 5000 }) };
    const mw = new RateLimitMiddleware(limiter as never, config);
    await expect(mw.execute(makeCtx(), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('rejects when the guild limit is exceeded (user passes)', async () => {
    const limiter = { checkAndIncrement: vi.fn()
      .mockResolvedValueOnce({ allowed: true, retryAfterMs: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterMs: 3000 }) };
    const mw = new RateLimitMiddleware(limiter as never, config);
    await expect(mw.execute(makeCtx({ guildId: 'g1' }), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('skips guild check for DM interactions', async () => {
    const limiter = { checkAndIncrement: vi.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0 }) };
    const mw = new RateLimitMiddleware(limiter as never, config);
    await mw.execute(makeCtx({ guildId: null }), async () => {});
    expect(limiter.checkAndIncrement).toHaveBeenCalledTimes(1); // user only
  });

  test('has priority 40', () => {
    expect(new RateLimitMiddleware({ checkAndIncrement: vi.fn() } as never, config).priority).toBe(40);
  });
});

// ─── PermissionMiddleware ─────────────────────────────────────────────────────

describe('PermissionMiddleware', () => {
  test('passes through when no permissions are required', async () => {
    const checker = {
      getMemberPermissions: vi.fn().mockResolvedValue(['SEND_MESSAGES']),
      getRequiredPermissions: vi.fn().mockReturnValue([]),
    };
    const mw = new PermissionMiddleware(checker);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('passes through when member has all required permissions', async () => {
    const checker = {
      getMemberPermissions: vi.fn().mockResolvedValue(['SEND_MESSAGES', 'BAN_MEMBERS']),
      getRequiredPermissions: vi.fn().mockReturnValue(['BAN_MEMBERS']),
    };
    const mw = new PermissionMiddleware(checker);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('rejects when member is missing a required permission', async () => {
    const checker = {
      getMemberPermissions: vi.fn().mockResolvedValue(['SEND_MESSAGES']),
      getRequiredPermissions: vi.fn().mockReturnValue(['BAN_MEMBERS']),
    };
    const mw = new PermissionMiddleware(checker);
    await expect(mw.execute(makeCtx(), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('passes through for DM interactions (no guild)', async () => {
    const checker = {
      getMemberPermissions: vi.fn(),
      getRequiredPermissions: vi.fn().mockReturnValue(['BAN_MEMBERS']),
    };
    const mw = new PermissionMiddleware(checker);
    let ran = false;
    await mw.execute(makeCtx({ guildId: null }), async () => { ran = true; });
    expect(ran).toBe(true);
    expect(checker.getMemberPermissions).not.toHaveBeenCalled();
  });

  test('has priority 50', () => {
    expect(new PermissionMiddleware({ getMemberPermissions: vi.fn(), getRequiredPermissions: vi.fn() }).priority).toBe(50);
  });
});

// ─── RBACMiddleware ───────────────────────────────────────────────────────────

describe('RBACMiddleware', () => {
  test('skips RBAC for core-tier commands', async () => {
    const resolver = {
      getHighestRole: vi.fn(),
      getRequiredRole: vi.fn().mockReturnValue('MOD'),
      isCoreTierCommand: vi.fn().mockReturnValue(true),
    };
    const mw = new RBACMiddleware(resolver);
    let ran = false;
    await mw.execute(makeCtx({ commandName: 'health' }), async () => { ran = true; });
    expect(ran).toBe(true);
    expect(resolver.getHighestRole).not.toHaveBeenCalled();
  });

  test('passes through when no role is required', async () => {
    const resolver = {
      getHighestRole: vi.fn().mockResolvedValue('MEMBER'),
      getRequiredRole: vi.fn().mockReturnValue(null),
      isCoreTierCommand: vi.fn().mockReturnValue(false),
    };
    const mw = new RBACMiddleware(resolver);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('passes through when the actor meets the required role', async () => {
    const resolver = {
      getHighestRole: vi.fn().mockResolvedValue('MOD'),
      getRequiredRole: vi.fn().mockReturnValue('MEMBER'),
      isCoreTierCommand: vi.fn().mockReturnValue(false),
    };
    const mw = new RBACMiddleware(resolver);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('rejects when the actor does not meet the required role', async () => {
    const resolver = {
      getHighestRole: vi.fn().mockResolvedValue('MEMBER'),
      getRequiredRole: vi.fn().mockReturnValue('MOD'),
      isCoreTierCommand: vi.fn().mockReturnValue(false),
    };
    const mw = new RBACMiddleware(resolver);
    await expect(mw.execute(makeCtx(), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('skips RBAC for DM interactions', async () => {
    const resolver = {
      getHighestRole: vi.fn(),
      getRequiredRole: vi.fn().mockReturnValue('MOD'),
      isCoreTierCommand: vi.fn().mockReturnValue(false),
    };
    const mw = new RBACMiddleware(resolver);
    let ran = false;
    await mw.execute(makeCtx({ guildId: null }), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('has priority 60', () => {
    expect(new RBACMiddleware({ getHighestRole: vi.fn(), getRequiredRole: vi.fn(), isCoreTierCommand: vi.fn() }).priority).toBe(60);
  });
});

// ─── CooldownMiddleware ───────────────────────────────────────────────────────

describe('CooldownMiddleware', () => {
  test('passes through when no cooldown is configured (0ms)', async () => {
    const store = new InMemoryCooldownStore();
    const config = { getCooldownMs: vi.fn().mockReturnValue(0) };
    const mw = new CooldownMiddleware(store, config);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('passes through and records a cooldown when not on cooldown', async () => {
    const store = new InMemoryCooldownStore();
    const config = { getCooldownMs: vi.fn().mockReturnValue(5000) };
    const mw = new CooldownMiddleware(store, config);
    let ran = false;
    await mw.execute(makeCtx({ userId: 'u1', commandName: 'ban' }), async () => { ran = true; });
    expect(ran).toBe(true);
    const remaining = await store.getRemainingMs('u1', 'ban');
    expect(remaining).toBeGreaterThan(0);
  });

  test('rejects when the user is on cooldown', async () => {
    const store = new InMemoryCooldownStore();
    await store.record('u1', 'ban', 5000);
    const config = { getCooldownMs: vi.fn().mockReturnValue(5000) };
    const mw = new CooldownMiddleware(store, config);
    await expect(mw.execute(makeCtx({ userId: 'u1', commandName: 'ban' }), async () => {})).rejects.toBeInstanceOf(MiddlewareRejectError);
  });

  test('InMemoryCooldownStore getRemainingMs returns 0 when no entry', async () => {
    const store = new InMemoryCooldownStore();
    expect(await store.getRemainingMs('u1', 'cmd')).toBe(0);
  });

  test('has priority 70', () => {
    expect(new CooldownMiddleware(new InMemoryCooldownStore(), { getCooldownMs: vi.fn() }).priority).toBe(70);
  });
});

// ─── DeferMiddleware ──────────────────────────────────────────────────────────

describe('DeferMiddleware', () => {
  test('calls deferReply when requiresDefer is true and interaction is present', async () => {
    const config = { requiresDefer: vi.fn().mockReturnValue(true), isEphemeral: vi.fn().mockReturnValue(false) };
    const mw = new DeferMiddleware(config);
    const deferReply = vi.fn().mockResolvedValue(undefined);
    const ctx = makeCtx();
    ctx.meta['interaction'] = { deferReply };
    await mw.execute(ctx, async () => {});
    expect(deferReply).toHaveBeenCalledWith({ ephemeral: false });
    expect(ctx.meta['deferred']).toBe(true);
  });

  test('does not call deferReply when requiresDefer is false', async () => {
    const config = { requiresDefer: vi.fn().mockReturnValue(false), isEphemeral: vi.fn().mockReturnValue(false) };
    const mw = new DeferMiddleware(config);
    const deferReply = vi.fn();
    const ctx = makeCtx();
    ctx.meta['interaction'] = { deferReply };
    await mw.execute(ctx, async () => {});
    expect(deferReply).not.toHaveBeenCalled();
  });

  test('does nothing when no interaction is in meta', async () => {
    const config = { requiresDefer: vi.fn().mockReturnValue(true), isEphemeral: vi.fn().mockReturnValue(false) };
    const mw = new DeferMiddleware(config);
    let ran = false;
    await mw.execute(makeCtx(), async () => { ran = true; });
    expect(ran).toBe(true);
  });

  test('has priority 80', () => {
    expect(new DeferMiddleware({ requiresDefer: vi.fn(), isEphemeral: vi.fn() }).priority).toBe(80);
  });
});

// ─── AnalyticsMiddleware ──────────────────────────────────────────────────────

describe('AnalyticsMiddleware', () => {
  test('sets invocationStart in meta and calls next', async () => {
    const logger = makeLogger() as unknown as Logger;
    const mw = new AnalyticsMiddleware(logger);
    const ctx = makeCtx();
    let ran = false;
    await mw.execute(ctx, async () => { ran = true; });
    expect(ran).toBe(true);
    expect(typeof ctx.meta['invocationStart']).toBe('number');
  });

  test('logs command-invocation after the handler runs', async () => {
    const logger = makeLogger() as unknown as Logger;
    const mw = new AnalyticsMiddleware(logger);
    await mw.execute(makeCtx(), async () => {});
    expect(logger.info).toHaveBeenCalled();
  });

  test('logs even when the handler throws', async () => {
    const logger = makeLogger() as unknown as Logger;
    const mw = new AnalyticsMiddleware(logger);
    await expect(mw.execute(makeCtx(), async () => { throw new Error('boom'); })).rejects.toThrow();
    expect(logger.info).toHaveBeenCalled();
  });

  test('has priority 90', () => {
    const logger = makeLogger() as unknown as Logger;
    expect(new AnalyticsMiddleware(logger).priority).toBe(90);
  });
});
