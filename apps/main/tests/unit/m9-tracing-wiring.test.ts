import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { initTracing, shutdownTracing } from '../../src/tracing/tracing.js';

/**
 * §5.10 — tracing/metrics. The metrics half was already wired (registry + /metrics server), but
 * the tracing half was inert: `initTracing` existed and was never called, and the
 * FLUSH_LOGS_AND_TRACES shutdown step was an empty stub. This proves the module's disabled path
 * is a clean no-op and that both call sites are now wired.
 */
const here = dirname(fileURLToPath(import.meta.url));
const src = (rel: string): string => readFileSync(resolve(here, '../../src', rel), 'utf8');

describe('M9 runtime step 4/4 — tracing/metrics', () => {
  test('initTracing is a no-op when disabled, and shutdownTracing is safe', async () => {
    expect(() => initTracing({ enabled: false, sampleRate: 0.1, exporterEndpoint: '' })).not.toThrow();
    await expect(shutdownTracing()).resolves.toBeUndefined();
  });

  test('bootstrap starts tracing from the telemetry env keys', () => {
    const bootstrap = src('bootstrap/bootstrap.ts');
    expect(bootstrap).toContain('initTracing(');
    expect(bootstrap).toContain("config.get('TELEMETRY_ENABLED')");
    expect(bootstrap).toContain("config.get('TRACE_SAMPLE_RATE')");
    expect(bootstrap).toContain("config.get('OTEL_EXPORTER_OTLP_ENDPOINT')");
  });

  test('the FLUSH_LOGS_AND_TRACES shutdown step flushes tracing', () => {
    const shutdown = src('shutdown/shutdown.ts');
    expect(shutdown).toContain("runStep(deps, 'FLUSH_LOGS_AND_TRACES', () => shutdownTracing())");
    expect(shutdown).not.toContain("runStep(deps, 'FLUSH_LOGS_AND_TRACES', async () => {})");
  });
});
