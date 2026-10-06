import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerHealthRoutes } from '../../../src/http/routes/health.routes.js';
import type { BootstrapProgress } from '../../../src/bootstrap/stages.js';

/**
 * ACC-ARCH-0008-3 — `/health/readiness` returns 200 only after the final bootstrap stage, and
 * 503 before it. Exercised in-process via Fastify `inject` (no live socket needed).
 */
function fakeProgress(state: {
  live: boolean;
  started: boolean;
  ready: boolean;
}): BootstrapProgress {
  return {
    isLive: () => state.live,
    isStarted: () => state.started,
    isReady: () => state.ready,
    currentStage: () => null,
  } as unknown as BootstrapProgress;
}

describe('health probes against a live server', () => {
  it('GET /health/liveness returns 200 once the process is up', async () => {
    const app = Fastify();
    registerHealthRoutes(app, fakeProgress({ live: true, started: true, ready: true }));
    const res = await app.inject({ method: 'GET', url: '/health/liveness' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('live');
    await app.close();
  });

  it('GET /health/readiness returns 503 before the final stage and 200 after', async () => {
    const app = Fastify();
    registerHealthRoutes(app, fakeProgress({ live: true, started: true, ready: false }));
    const before = await app.inject({ method: 'GET', url: '/health/readiness' });
    expect(before.statusCode).toBe(503);
    await app.close();

    const ready = Fastify();
    registerHealthRoutes(ready, fakeProgress({ live: true, started: true, ready: true }));
    const after = await ready.inject({ method: 'GET', url: '/health/readiness' });
    expect(after.statusCode).toBe(200);
    expect(after.json().status).toBe('ready');
    await ready.close();
  });
});
