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

// UR-20261029-111 — a module's own asset, served from the module's directory. The three branches
// matter: an unknown module, a path that escapes the module, and the file that exists.
test('buildApiServer serves a module asset from the module, and refuses to escape it', async () => {
  const { mkdtempSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const root = mkdtempSync(join(tmpdir(), 'module-asset-'));
  writeFileSync(join(root, 'banner.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

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
    moduleRegistry: {
      all: () => [{ manifest: { name: 'dashboard' }, root }],
    } as never,
  });
  await app.ready();

  // The module's own file is served.
  const served = await app.inject({ method: 'GET', url: '/modules/dashboard/banner.png' });
  expect(served.statusCode).toBe(200);
  expect(served.headers['content-type']).toBe('image/png');

  // A module the registry does not know is a 404, not a directory read.
  const unknown = await app.inject({ method: 'GET', url: '/modules/nope/banner.png' });
  expect(unknown.statusCode).toBe(404);

  // A path that climbs out of the module is refused.
  const escape = await app.inject({
    method: 'GET',
    url: '/modules/dashboard/..%2F..%2Fetc%2Fpasswd',
  });
  expect(escape.statusCode).toBe(400);

  // A declared asset that is not there is a 404.
  const missing = await app.inject({ method: 'GET', url: '/modules/dashboard/absent.png' });
  expect(missing.statusCode).toBe(404);
});
