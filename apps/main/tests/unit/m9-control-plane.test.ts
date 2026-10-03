import { test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import Fastify from 'fastify';
import {
  PowerEngineDispatcher,
  InMemoryAuditWriter,
} from '../../src/http/power-engine-dispatcher.js';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';

const trusted = { trustedSources: ['dashboard', 'swastik-internal'] };

test('allowed audit row is written after the handler has fully succeeded', async () => {
  const auditWriter = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(trusted, auditWriter);

  let rowsSeenDuringHandler = -1;
  const outcome = await dispatcher.dispatch(
    'guild.suspend',
    { actorId: 'owner-1', source: 'dashboard', reason: 'ToS violation' },
    async () => {
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

  // §22.6 — the attempt IS recorded, but as `failed`: the audit never claims success for an
  // invocation that crashed.
  expect(auditWriter.entries.filter((e) => e.outcome === 'allowed')).toHaveLength(0);
  expect(auditWriter.entries).toHaveLength(1);
  expect(auditWriter.entries[0]?.outcome).toBe('failed');
});

const STUB_POWER_ENGINE_ACTIONS = [
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

test('every previously-stubbed Power Engine route answers honest 501 (no-stub walk)', async () => {
  const app = Fastify();
  const dispatcher = { dispatch: vi.fn() };
  registerAdminRoutes(app, {
    dispatcher,
    db: { knex: vi.fn() },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  } as never);

  for (const { path, action } of STUB_POWER_ENGINE_ACTIONS) {
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
    url: '/admin/power-engine/queryAuditLog?source=power-engine-internal&actorId=owner-1&action=guild.suspend&limit=10',
  });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual(rows);
  expect(builder.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  expect(builder.where).toHaveBeenNthCalledWith(1, { source: 'power-engine-internal' });
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

test('jose and cron-parser are no longer direct dependencies (package.json gate)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  expect(pkg.dependencies.jose).toBeUndefined();
  expect(pkg.dependencies['cron-parser']).toBeUndefined();
  expect(pkg.dependencies.bullmq).toBeDefined();
});
