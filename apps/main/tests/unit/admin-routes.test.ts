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
});

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
});

test('PEP economy endpoint dispatches to power engine', async () => {
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
    url: '/admin/power-engine/economy/balance-adjust',
    body: { actorId: 'admin', source: 'internal', reason: 'adjustment' },
  });
  expect(res.statusCode).toBe(200);
  expect(dispatcher.dispatch).toHaveBeenCalledWith(
    'economy.balance-adjust',
    expect.any(Object),
    expect.any(Function),
  );
});

test('PEP feature-flags endpoint dispatches to power engine', async () => {
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
    body: { actorId: 'admin', source: 'internal', reason: 'toggle feature' },
  });
  expect(res.statusCode).toBe(200);
  expect(dispatcher.dispatch).toHaveBeenCalledWith(
    'feature-flags.toggle',
    expect.any(Object),
    expect.any(Function),
  );
});
