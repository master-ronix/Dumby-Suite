/**
 * OpenTelemetry tracing setup (Cluster: Glass).
 * Initialises the OTel Node SDK with OTLP HTTP exporter.
 * One root span per command; TRACE_SAMPLE_RATE default 0.1.
 *
 * This is a Tier-2 implementation: the SDK is correctly wired but
 * exercising it end-to-end requires an operator-supplied OTLP collector
 * endpoint (OTEL_EXPORTER_OTLP_ENDPOINT).
 *
 * Package versions (July 2026):
 *   @opentelemetry/sdk-node            ^0.221.0
 *   @opentelemetry/exporter-trace-otlp-http  ^0.221.0
 *   @opentelemetry/auto-instrumentations-node ^0.79.0
 *   @opentelemetry/sdk-trace-base      ^2.10.0  (sampler)
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

export interface TracingConfig {
  enabled: boolean;
  sampleRate: number;
  exporterEndpoint: string;
  serviceName?: string;
}

let sdk: NodeSDK | null = null;

export function initTracing(config: TracingConfig): void {
  if (!config.enabled) return;

  const exporter = config.exporterEndpoint
    ? new OTLPTraceExporter({ url: config.exporterEndpoint })
    : undefined;

  const sdkConfig: ConstructorParameters<typeof NodeSDK>[0] = {
    serviceName: config.serviceName ?? 'dumby',
    sampler: new TraceIdRatioBasedSampler(config.sampleRate),
    instrumentations: [getNodeAutoInstrumentations()],
  };
  if (exporter) {
    sdkConfig.traceExporter = exporter;
  }
  sdk = new NodeSDK(sdkConfig);

  sdk.start();
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
