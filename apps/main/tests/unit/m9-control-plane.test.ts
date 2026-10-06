import { test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import Fastify from 'fastify';
import {
  PowerEngineDispatcher,
  InMemoryAuditWriter,
} from '../../src/http/power-engine-dispatcher.js';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';

const trusted = { trustedSources: ['dashboard', 'swastik-internal'] };

/**
 * UR-A-05 / UR-B-06: audit rows must reflect the real outcome — an
 * `allowed` row is written only AFTER the handler completes successfully,
 * never before it has run.
 */
test('allowed audit row is written after the handler has fully succeeded', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);

  let rowsSeenDuringHandler = -1;
  const outcome = await dispatcher.dispatch(
    'guild.suspend',
    { actorId: 'owner-1', source: 'dashboard', reason: 'ToS violation' },
    async () => {
      // The handler must observe ZERO audit rows already written for this
      // attempt: the 'allowed' write happens strictly after it returns.
      rowsSeenDuringHandler = auditWriter.entries.length;
      return { suspended: true };
    },
  );

  expect(outcome).toStrictEqual({ ok: true, result: { suspended: true } });
  expect(rowsSeenDuringHandler).toBe(0);
  expect(auditWriter.entries.length).toBe(1);
  expect(auditWriter.entries[0]).toMatchObject({
    action: 'guild.suspend',
    outcome: 'allowed',
    actorId: 'owner-1',
  });
});

test('a handler that throws never records an "allowed" row for that attempt', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);

  await expect(
    dispatcher.dispatch(
      'guild.suspend',
      { actorId: 'owner-1', source: 'dashboard', reason: 'ToS violation' },
      async () => {
        throw new Error('handler crashed');
      },
    ),
  ).rejects.toThrow('handler crashed');

  expect(auditWriter.entries.length).toBe(0);
});

/**
 * UR-C-25: the stub PEP handlers must answer honest 501 NOT_IMPLEMENTED
 * instead of returning `200 {ok:true}` from an `async () => {}` body.
 */
const STUB_PEP_ACTIONS = [
  { path: '/admin/power-engine/economy/balance-adjust', action: 'economy.balance-adjust' },
  { path: '/admin/power-engine/rbac/role-assign', action: 'rbac.role-assign' },
  { path: '/admin/power-engine/marketplace/review', action: 'marketplace.review' },
  { path: '/admin/power-engine/backups/create', action: 'backups.create' },
  { path: '/admin/power-engine/telemetry/config-update', action: 'telemetry.config-update' },
  { path: '/admin/power-engine/sharding/rebalance', action: 'sharding.rebalance' },
  { path: '/admin/power-engine/credentials/rotate', action: 'credentials.rotate' },
  { path: '/admin/power-engine/audit/export', action: 'audit.export' },
  { path: '/admin/power-engine/notifications/broadcast', action: 'notifications.broadcast' },
  { path: '/admin/power-engine/tasks/schedule', action: 'tasks.schedule' },
  { path: '/admin/power-engine/webhooks/rotate-secret', action: 'webhooks.rotate-secret' },
  { path: '/admin/power-engine/cache/invalidate', action: 'cache.invalidate' },
];

test('every previously-stubbed PEP route answers honest 501 (no-stub walk)', async () => {
  const app = Fastify();
  const dispatcher = { dispatch: vi.fn() };
  registerAdminRoutes(app, {
    dispatcher,
    db: { knex: vi.fn() },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  for (const { path, action } of STUB_PEP_ACTIONS) {
    const res = await app.inject({
      method: 'POST',
      url: path,
      body: { actorId: 'admin', source: 'internal', reason: 'test' },
    });
    expect(res.statusCode).toBe(501);
    expect(res.json().error?.code).toBe('NOT_IMPLEMENTED');
    expect((res.json().error?.message as string) ?? '').toContain(action);
  }

  expect(dispatcher.dispatch).not.toHaveBeenCalled();
}, 30_000);

/**
 * UR-B-07 (queryAuditLog portion): the route must query only columns that
 * exist in migration 00008 — order by `createdAt`, filter on source/actorId/
 * action/outcome — never the phantom targetType/targetId/timestamp.
 */
test('queryAuditLog orders by real createdAt column and filters real columns only', async () => {
  const rows = [{ createdAt: '2026-09-23T00:00:00Z', action: 'guild.suspend' }];
  const builder = {
    orderBy: vi.fn(() => builder),
    where: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: undefined as unknown,
  };
  builder.then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(onF, onR);

  const app = Fastify();
  registerAdminRoutes(app, {
    dispatcher: { dispatch: vi.fn() },
    db: { knex: vi.fn(() => builder) },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  const res = await app.inject({
    method: 'GET',
    url: '/admin/power-engine/queryAuditLog?source=pep-internal&actorId=owner-1&action=guild.suspend&limit=10',
  });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual(rows);
  expect(builder.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  expect(builder.where).toHaveBeenNthCalledWith(1, { source: 'pep-internal' });
  expect(builder.where).toHaveBeenNthCalledWith(2, { actorId: 'owner-1' });
  expect(builder.where).toHaveBeenNthCalledWith(3, { action: 'guild.suspend' });
  expect(builder.limit).toHaveBeenCalledWith(10);
});

test('queryAuditLog ignores unknown filter params and clamps the limit to 200', async () => {
  const rows: unknown[] = [];
  const builder = {
    orderBy: vi.fn(() => builder),
    where: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: undefined as unknown,
  };
  builder.then = (onF: (v: unknown) => unknown, onR: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(onF, onR);

  const app = Fastify();
  registerAdminRoutes(app, {
    dispatcher: { dispatch: vi.fn() },
    db: { knex: vi.fn(() => builder) },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  const res = await app.inject({
    method: 'GET',
    url: '/admin/power-engine/queryAuditLog?limit=99999',
  });
  expect(res.statusCode).toBe(200);
  expect(builder.where).toHaveBeenCalledTimes(0);
  expect(builder.limit).toHaveBeenCalledWith(200);
});

/**
 * UR-A-30: cron-parser and jose must no longer be direct dependencies; the
 * only remaining lockfile copy of cron-parser is the transitive one pulled by
 * bullmq (the queue worker still needs it at runtime, so the app keeps
 * resolving it).
 */
test('jose and cron-parser are no longer direct dependencies (package.json gate)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  expect(pkg.dependencies.jose).toBeUndefined();
  expect(pkg.dependencies['cron-parser']).toBeUndefined();
  expect(pkg.dependencies.bullmq).toBeDefined();
});
