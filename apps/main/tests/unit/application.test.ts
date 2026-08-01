import { test, expect } from 'vitest';
import { createApplicationContext } from '../../src/application/ApplicationContext.js';
import {
  readHealthProbes,
  healthProbeSummary,
  attachHealthEndpoint,
} from '../../src/application/HealthServer.js';
import { BootstrapProgress } from '../../src/bootstrap/stages.js';
import Fastify from 'fastify';

test('createApplicationContext freezes the returned object', () => {
  const ctx = createApplicationContext({} as never);
  expect(Object.isFrozen(ctx)).toBe(true);
});

test('readHealthProbes returns liveness/startup/readiness from progress', () => {
  const progress = new BootstrapProgress();
  expect(readHealthProbes(progress)).toStrictEqual({
    liveness: false,
    startup: false,
    readiness: false,
  });
  progress.advanceTo('OBSERVABILITY_INIT');
  expect(readHealthProbes(progress).liveness).toBe(true);
});

test('healthProbeSummary returns a string with stage info', () => {
  const progress = new BootstrapProgress();
  const summary = healthProbeSummary(progress);
  expect(summary).toContain('stage: none (0/18)');
  expect(summary).toContain('live: false');

  progress.advanceTo('OBSERVABILITY_INIT');
  const summary2 = healthProbeSummary(progress);
  expect(summary2).toContain('stage: OBSERVABILITY_INIT (4/18)');
  expect(summary2).toContain('live: true');
});

test('attachHealthEndpoint adds /health/probes route', async () => {
  const app = Fastify();
  const progress = new BootstrapProgress();
  attachHealthEndpoint(app, progress);
  progress.advanceTo('OBSERVABILITY_INIT');

  const res = await app.inject({ method: 'GET', url: '/health/probes' });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(body.liveness).toBe(true);
  expect(body.startup).toBe(false);
  expect(body.currentStage).toBe('OBSERVABILITY_INIT');
});
