import { test, expect, vi } from 'vitest';
import { buildApiServer, buildHealthServer, buildMetricsServer } from '../../src/http/server.js';

const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), fatal: vi.fn() };

function makeConfig() {
  const values: Record<string, string> = {
    INTERNAL_API_KEY: 'k',
    NODE_ENV: 'test',
    OPENAPI_CONTRACT_PATH: '/definitely/not/here.yaml',
  };
  return {
    get: (key: string) => values[key],
    redactedSnapshot: () => ({ redacted: true }),
  };
}

test('buildApiServer serves /api/info and gates /admin behind the internal key', async () => {
  const app = buildApiServer({
    logger: logger as never,
    progress: {
      isLive: () => true,
      isStarted: () => true,
      isReady: () => true,
      currentStage: () => 'running',
    } as never,
    metrics: { contentType: () => 'text/plain', metricsText: async () => '' } as never,
    config: makeConfig() as never,
    adminDeps: {
      dispatcher: { dispatch: vi.fn() },
      db: { knex: vi.fn() },
      config: { redactedSnapshot: () => ({}) },
      auditWriter: { write: vi.fn() },
    } as never,
  });
  await app.ready();

  const info = await app.inject({ method: 'GET', url: '/api/info' });
  expect(info.statusCode).toBe(200);
  expect(info.json().name).toBe('dumby-headless-backend');

  const denied = await app.inject({ method: 'GET', url: '/admin/config' });
  expect(denied.statusCode).toBe(401);

  const allowed = await app.inject({
    method: 'GET',
    url: '/admin/config',
    headers: { 'x-internal-api-key': 'k' },
  });
  expect(allowed.statusCode).toBe(200);

  const openapi = await app.inject({ method: 'GET', url: '/openapi.yaml' });
  expect(openapi.statusCode).toBe(501);

  await app.close();
});

test('buildHealthServer reports liveness, startup and readiness', async () => {
  const app = buildHealthServer({
    isLive: () => false,
    isStarted: () => true,
    isReady: () => false,
    currentStage: () => 'stage-1',
  } as never);
  await app.ready();

  expect((await app.inject({ method: 'GET', url: '/health/liveness' })).statusCode).toBe(503);
  expect((await app.inject({ method: 'GET', url: '/health/startup' })).statusCode).toBe(200);
  expect((await app.inject({ method: 'GET', url: '/health/readiness' })).statusCode).toBe(503);

  await app.close();
});

test('buildMetricsServer exposes /metrics', async () => {
  const app = buildMetricsServer({
    contentType: () => 'text/plain',
    metricsText: async () => 'dumby_up 1',
  } as never);
  await app.ready();

  const res = await app.inject({ method: 'GET', url: '/metrics' });
  expect(res.statusCode).toBe(200);
  expect(res.body).toContain('dumby_up 1');

  await app.close();
});
