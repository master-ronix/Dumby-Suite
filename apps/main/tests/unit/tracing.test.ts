import { test, expect, vi } from 'vitest';

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(function () {
    return { start: vi.fn(), shutdown: vi.fn().mockResolvedValue(undefined) };
  }),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@opentelemetry/sdk-trace-base', () => ({
  TraceIdRatioBasedSampler: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

import { initTracing, shutdownTracing } from '../../src/tracing/tracing.js';

test('shutdownTracing is safe to call before init', async () => {
  await expect(shutdownTracing()).resolves.toBeUndefined();
});

test('initTracing is a no-op when enabled is false', () => {
  expect(() =>
    initTracing({ enabled: false, sampleRate: 0.1, exporterEndpoint: '' }),
  ).not.toThrow();
});

test('initTracing with enabled true does not throw', () => {
  expect(() =>
    initTracing({
      enabled: true,
      sampleRate: 0.1,
      exporterEndpoint: 'http://localhost:4318/v1/traces',
    }),
  ).not.toThrow();
});

test('shutdownTracing after init resolves', async () => {
  await expect(shutdownTracing()).resolves.toBeUndefined();
});

test('initTracing supports an empty exporterEndpoint (SDK fallback)', () => {
  expect(() =>
    initTracing({ enabled: true, sampleRate: 0.5, exporterEndpoint: '', serviceName: 'test' }),
  ).not.toThrow();
});
