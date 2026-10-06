import { test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';

/**
 * A chainable Knex double: every builder method returns the chain, `update`/`merge` resolve to 1,
 * `first` resolves to a configurable row, and awaiting the chain resolves to an empty row set.
 */
function makeKnex(opts: { firstResult?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    where: self,
    orderBy: self,
    limit: self,
    insert: self,
    onConflict: self,
    returning: self,
    del: self,
    update: () => Promise.resolve(1),
    merge: () => Promise.resolve(1),
    first: () => Promise.resolve(opts.firstResult),
    then: (res: (v: unknown) => unknown) => Promise.resolve([]).then(res),
  });
  const knex = (() => chain) as unknown as Record<string, unknown> & (() => unknown);
  (knex as Record<string, unknown>).raw = () => 'raw';
  return knex;
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const dispatcher = {
    dispatch: vi.fn(async (_a: unknown, _b: unknown, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch {
        // route callbacks guard on missing inputs; the mock simply records the call
      }
      return { ok: true };
    }),
    dispatchFunction: vi.fn(async () => ({ ok: true })),
  };
  return {
    dispatcher,
    db: { knex: makeKnex() },
    config: { redactedSnapshot: vi.fn().mockReturnValue({}) },
    auditWriter: { write: vi.fn() },
    ...overrides,
  };
}

function build(deps: Record<string, unknown>) {
  const app = Fastify();
  registerAdminRoutes(app, deps as never);
  return app;
}

test('GET /admin/system/maintenance-mode returns the default when unset', async () => {
  const app = build(makeDeps());
  const res = await app.inject({ method: 'GET', url: '/admin/system/maintenance-mode' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ enabled: false, reason: null });
});

test('guild suspend and restore dispatch through the power engine', async () => {
  const deps = makeDeps();
  const app = build(deps);
  for (const path of [
    '/admin/power-engine/guild/g1/suspend',
    '/admin/power-engine/guild/g1/restore',
  ]) {
    const res = await app.inject({
      method: 'POST',
      url: path,
      body: { actorId: 'admin', reason: 'x' },
    });
    expect(res.statusCode, path).toBe(200);
  }
  const actions = (deps.dispatcher.dispatch as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => c[0],
  );
  expect(actions).toContain('guild.suspend');
  expect(actions).toContain('guild.restore');
});

test('module suspend/restore dispatch and use the ceiling + collision services', async () => {
  const deps = makeDeps({
    ceilingService: { guard: vi.fn().mockResolvedValue(undefined), project: vi.fn() },
    collisionResolution: {
      handleModuleDisable: vi.fn().mockResolvedValue(undefined),
      pauseOnCollision: vi.fn().mockResolvedValue([]),
    },
  });
  const app = build(deps);
  const suspend = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/module/m1/suspend',
    body: { guildId: 'g1', actorId: 'a', reason: 'r' },
  });
  expect(suspend.statusCode).toBe(200);
  const restore = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/module/m1/restore',
    body: { guildId: 'g1', actorId: 'a', reason: 'r' },
  });
  expect(restore.statusCode).toBe(200);
  expect(deps.ceilingService.guard).toHaveBeenCalled();
  expect(deps.collisionResolution.pauseOnCollision).toHaveBeenCalled();
});

test('every unbacked Power Engine action answers an honest 501', async () => {
  const app = build(makeDeps());
  const urls = [
    '/admin/power-engine/economy/balance-adjust',
    '/admin/power-engine/rbac/role-assign',
    '/admin/power-engine/marketplace/review',
    '/admin/power-engine/backups/create',
    '/admin/power-engine/telemetry/config-update',
    '/admin/power-engine/sharding/rebalance',
    '/admin/power-engine/credentials/rotate',
    '/admin/power-engine/audit/export',
    '/admin/power-engine/notifications/broadcast',
    '/admin/power-engine/tasks/schedule',
    '/admin/power-engine/webhooks/rotate-secret',
    '/admin/power-engine/cache/invalidate',
    '/admin/power-engine/requeueDeadLetter',
    '/admin/power-engine/overrideRateLimit',
    '/admin/power-engine/restartShardGroup',
    '/admin/power-engine/triggerCoreRestart',
    '/admin/power-engine/rollbackModuleVersion',
  ];
  for (const url of urls) {
    const res = await app.inject({ method: 'POST', url, body: {} });
    expect(res.statusCode, url).toBe(501);
    expect(res.json().error?.code, url).toBe('NOT_IMPLEMENTED');
  }
});

test('suspendDeveloper, suspendCommand and exitMaintenanceMode dispatch', async () => {
  const deps = makeDeps();
  const app = build(deps);
  for (const [url, body] of [
    ['/admin/power-engine/suspendDeveloper', { devId: 'd1', actorId: 'a', reason: 'r' }],
    ['/admin/power-engine/suspendCommand', { commandName: 'hello', actorId: 'a', reason: 'r' }],
    ['/admin/power-engine/exitMaintenanceMode', { actorId: 'a', reason: 'r' }],
  ] as const) {
    const res = await app.inject({ method: 'POST', url, body });
    expect(res.statusCode, url).toBe(200);
  }
});

test('catalog functions 501 without a catalog, dispatch with one', async () => {
  let app = build(makeDeps());
  let res = await app.inject({ method: 'POST', url: '/admin/power-engine/suspendGuild', body: {} });
  expect(res.statusCode).toBe(501);

  const deps = makeDeps({ powerEngineCatalog: new Map() });
  app = build(deps);
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/suspendGuild',
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/unsuspendGuild',
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
  expect(deps.dispatcher.dispatchFunction).toHaveBeenCalled();
});

test('queue pause/resume 501 without a queue manager, act with one', async () => {
  let app = build(makeDeps());
  let res = await app.inject({ method: 'POST', url: '/admin/power-engine/pauseQueue', body: {} });
  expect(res.statusCode).toBe(501);

  const queueManager = {
    list: () => ['a', 'b'],
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  };
  app = build(makeDeps({ queueManager }));
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/pauseQueue',
    body: { queue: 'a' },
  });
  expect(res.json()).toStrictEqual({ paused: ['a'] });
  res = await app.inject({ method: 'POST', url: '/admin/power-engine/pauseQueue', body: {} });
  expect(res.json()).toStrictEqual({ paused: ['a', 'b'] });
  res = await app.inject({ method: 'POST', url: '/admin/power-engine/resumeQueue', body: {} });
  expect(res.json()).toStrictEqual({ resumed: ['a', 'b'] });
});

test('GET queryAuditLog returns the row set', async () => {
  const app = build(makeDeps());
  const res = await app.inject({
    method: 'GET',
    url: '/admin/power-engine/queryAuditLog?source=x&actorId=a&action=y&outcome=allowed&limit=10',
  });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual([]);
});

test('revokeModuleSignature returns 404 when no key matched', async () => {
  const deps = makeDeps();
  (deps.dispatcher.dispatch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, result: 0 });
  const app = build(deps);
  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/revokeModuleSignature',
    body: { moduleSlug: 'm', keyId: 'k', actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(404);
});

test('revokeModuleSignature returns 200 on success', async () => {
  const app = build(makeDeps());
  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/revokeModuleSignature',
    body: { moduleSlug: 'm', keyId: 'k', actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
});

test('command-ceiling routes 501 without the service, serve with it', async () => {
  let app = build(makeDeps());
  let res = await app.inject({ method: 'GET', url: '/admin/power-engine/command-ceiling/g1' });
  expect(res.statusCode).toBe(501);
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/command-ceiling/g1/guard',
    body: {},
  });
  expect(res.statusCode).toBe(501);

  const ceilingService = {
    project: vi.fn().mockResolvedValue({ used: 1 }),
    guard: vi.fn().mockResolvedValue(undefined),
  };
  app = build(makeDeps({ ceilingService }));
  res = await app.inject({ method: 'GET', url: '/admin/power-engine/command-ceiling/g1' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ used: 1 });
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/command-ceiling/g1/guard',
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
});

test('collision routes 501 without the service, serve with it', async () => {
  let app = build(makeDeps());
  let res = await app.inject({ method: 'GET', url: '/admin/power-engine/collisions/g1' });
  expect(res.statusCode).toBe(501);
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/collisions/g1/resolve',
    body: {},
  });
  expect(res.statusCode).toBe(501);

  const collisionResolution = { resolveCollision: vi.fn().mockResolvedValue({ resolved: true }) };
  app = build(makeDeps({ collisionResolution }));
  res = await app.inject({ method: 'GET', url: '/admin/power-engine/collisions/g1' });
  expect(res.statusCode).toBe(200);
  res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/collisions/g1/resolve',
    body: { moduleSlug: 'm', commandKey: 'c', resolveInFavourOf: 'x', actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
  expect(collisionResolution.resolveCollision).toHaveBeenCalled();
});

test('developer approval refuses without a verifier (identical 401)', async () => {
  const app = build(makeDeps());
  const res = await app.inject({
    method: 'POST',
    url: '/admin/governance/developers/d1/approve',
    headers: { authorization: 'Bearer k.s' },
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(401);
  expect(res.json()).toStrictEqual({});
});

test('developer approval refuses a non-allow-listed operator (403)', async () => {
  const app = build(
    makeDeps({
      operatorVerifier: { verify: vi.fn().mockResolvedValue({}) },
      operatorAllowList: [],
    }),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/admin/governance/developers/d1/approve',
    headers: { authorization: 'Bearer k.s' },
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(403);
});

test('developer approval of a subject with no license row is 409', async () => {
  const app = build(
    makeDeps({
      operatorVerifier: { verify: vi.fn().mockResolvedValue({}) },
      operatorAllowList: ['a'],
    }),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/admin/governance/developers/d1/approve',
    headers: { authorization: 'Bearer k.s' },
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(409);
});

test('developer decline by an allow-listed operator dispatches', async () => {
  const deps = makeDeps({
    operatorVerifier: { verify: vi.fn().mockResolvedValue({}) },
    operatorAllowList: ['a'],
  });
  const app = build(deps);
  const res = await app.inject({
    method: 'POST',
    url: '/admin/governance/developers/d1/decline',
    headers: { authorization: 'Bearer k.s' },
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(200);
});

test('a failing operator credential verification is a 401', async () => {
  const app = build(
    makeDeps({
      operatorVerifier: { verify: vi.fn().mockRejectedValue(new Error('bad')) },
      operatorAllowList: ['a'],
    }),
  );
  const res = await app.inject({
    method: 'POST',
    url: '/admin/governance/developers/d1/decline',
    headers: { authorization: 'Bearer k.s' },
    body: { actorId: 'a', reason: 'r' },
  });
  expect(res.statusCode).toBe(401);
});
