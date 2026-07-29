import { test, expect, describe } from 'vitest';
import { MetricsRegistry } from '../../src/metrics/registry.js';

describe('MetricsRegistry', () => {
  test('can be instantiated without throwing', () => {
    expect(() => new MetricsRegistry()).not.toThrow();
  });

  test('metricsText() returns a non-empty string', async () => {
    const reg = new MetricsRegistry();
    const text = await reg.metricsText();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  test('metricsText() contains the Prometheus help comment format', async () => {
    const reg = new MetricsRegistry();
    const text = await reg.metricsText();
    expect(text).toContain('# HELP');
  });

  test('contentType() returns the Prometheus content type', () => {
    const reg = new MetricsRegistry();
    const ct = reg.contentType();
    expect(ct).toContain('text/plain');
  });

  test('httpRequestDuration metric is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.httpRequestDuration).toBeDefined();
  });

  test('gatewayEventsShedTotal metric is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.gatewayEventsShedTotal).toBeDefined();
  });

  test('eventBusCycleDetectedTotal metric is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.eventBusCycleDetectedTotal).toBeDefined();
  });

  test('moduleLoadDurationSeconds metric is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.moduleLoadDurationSeconds).toBeDefined();
  });

  test('rateLimitFallbackActive gauge is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.rateLimitFallbackActive).toBeDefined();
  });

  test('cacheHitRatio gauge is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.cacheHitRatio).toBeDefined();
  });

  test('queueDepth gauge is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.queueDepth).toBeDefined();
  });

  test('queueFailedJobsTotal counter is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.queueFailedJobsTotal).toBeDefined();
  });

  test('permissionDeniedTotal counter is accessible', () => {
    const reg = new MetricsRegistry();
    expect(reg.permissionDeniedTotal).toBeDefined();
  });

  test('each instance has an independent registry (no cross-contamination)', async () => {
    const r1 = new MetricsRegistry();
    const r2 = new MetricsRegistry();
    expect(r1.registry).not.toBe(r2.registry);
  });
});
