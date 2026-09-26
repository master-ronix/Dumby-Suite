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
