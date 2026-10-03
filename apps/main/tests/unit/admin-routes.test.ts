import { test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAdminRoutes } from '../../src/http/routes/admin.routes.js';

test('GET /admin/config returns config snapshot', async () => {
  const app = Fastify();
  const deps = {
    dispatcher: { dispatch: vi.fn() },
    db: { knex: vi.fn() },
    config: { redactedSnapshot: vi.fn().mockReturnValue({ foo: 'bar' }) },
    auditWriter: { write: vi.fn() },
  };
  registerAdminRoutes(app, deps as never);

  const res = await app.inject({ method: 'GET', url: '/admin/config' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ foo: 'bar' });
}, 15_000);

test('POST /admin/system/maintenance-mode dispatches to power engine', async () => {
  const app = Fastify();
  const dispatcher = { dispatch: vi.fn().mockResolvedValue({ ok: true }) };
  const deps = {
    dispatcher,
    db: { knex: () => ({ where: () => ({ update: vi.fn().mockResolvedValue(1) }) }) },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  };
  registerAdminRoutes(app, deps as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/system/maintenance-mode',
    body: { actorId: 'admin', source: 'internal', reason: 'maintenance', enabled: true },
  });
  expect(res.statusCode).toBe(200);
  expect(dispatcher.dispatch).toHaveBeenCalled();
}, 15_000);

test('Power Engine economy endpoint answers honest 501 (no stub, no fake 200)', async () => {
  const app = Fastify();
  const dispatcher = { dispatch: vi.fn() };
  const deps = {
    dispatcher,
    db: { knex: vi.fn() },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  };
  registerAdminRoutes(app, deps as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/economy/balance-adjust',
    body: { actorId: 'admin', source: 'internal', reason: 'adjustment' },
  });
  expect(res.statusCode).toBe(501);
  expect(res.json().error?.code).toBe('NOT_IMPLEMENTED');
  expect(dispatcher.dispatch).not.toHaveBeenCalled();
});

test('Power Engine feature-flags endpoint answers honest 501 and dispatches nothing (UR-A-04)', async () => {
  const app = Fastify();
  const dispatcher = { dispatch: vi.fn().mockResolvedValue({ ok: true }) };
  const deps = {
    dispatcher,
    db: { knex: vi.fn() },
    config: { redactedSnapshot: vi.fn() },
    auditWriter: { write: vi.fn() },
  };
  registerAdminRoutes(app, deps as never);

  const res = await app.inject({
    method: 'POST',
    url: '/admin/power-engine/feature-flags/toggle',
    body: { actorId: 'admin', reason: 'toggle feature' },
  });
  expect(res.statusCode).toBe(501);
  expect(res.json().error?.code).toBe('NOT_IMPLEMENTED');
  expect(dispatcher.dispatch).not.toHaveBeenCalled();
});
