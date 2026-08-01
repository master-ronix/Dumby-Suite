import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { registerHealthRoutes } from '../../src/http/routes/health.routes.js';
import { registerInfoRoutes } from '../../src/http/routes/info.routes.js';
import { registerMetricsRoutes } from '../../src/http/routes/metrics.routes.js';
import { BootstrapProgress } from '../../src/bootstrap/stages.js';

test('GET /health/liveness returns 200 once live', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);
  progress.advanceTo('OBSERVABILITY_INIT');

  const res = await app.inject({ method: 'GET', url: '/health/liveness' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ status: 'live' });
});

test('GET /health/liveness returns 503 before live', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);

  const res = await app.inject({ method: 'GET', url: '/health/liveness' });
  expect(res.statusCode).toBe(503);
  expect(res.json().status).toBe('starting');
});

test('GET /health/startup returns 200 after DISCORD_LOGIN', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);
  progress.advanceTo('DISCORD_LOGIN');

  const res = await app.inject({ method: 'GET', url: '/health/startup' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ status: 'started' });
});

test('GET /health/startup returns 503 before DISCORD_LOGIN', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);
  progress.advanceTo('EVENT_REGISTER');

  const res = await app.inject({ method: 'GET', url: '/health/startup' });
  expect(res.statusCode).toBe(503);
});

test('GET /health/readiness returns 200 after ready', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);
  progress.advanceTo('STARTUP_COMPLETE');
  progress.setRequiredModulesHealthy(true);

  const res = await app.inject({ method: 'GET', url: '/health/readiness' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toStrictEqual({ status: 'ready' });
});

test('GET /health/readiness returns 503 before ready', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  registerHealthRoutes(app, progress);
  progress.advanceTo('STARTUP_COMPLETE');

  const res = await app.inject({ method: 'GET', url: '/health/readiness' });
  expect(res.statusCode).toBe(503);
});

test('GET /api/info returns metadata with env', async () => {
  const app = Fastify();
  const mockConfig = { get: (key: string) => (key === 'NODE_ENV' ? 'test' : '') };
  registerInfoRoutes(app, mockConfig as never);

  const res = await app.inject({ method: 'GET', url: '/api/info' });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.name).toBe('dumby-headless-backend');
  expect(body.version).toBe('1.0.0-v1');
  expect(body.environment).toBe('test');
  expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
});

test('GET /metrics returns prometheus content type', async () => {
  const app = Fastify();
  const mockMetrics = {
    contentType: () => 'text/plain; charset=utf-8',
    metricsText: () => Promise.resolve('# HELP test'),
  };
  registerMetricsRoutes(app, mockMetrics as never);

  const res = await app.inject({ method: 'GET', url: '/metrics' });
  expect(res.statusCode).toBe(200);
  expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
});
