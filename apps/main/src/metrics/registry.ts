/**
 * Metrics registry (Cluster: Glass). Wraps prom-client. GET /metrics
 * serves `registry.metrics()` in the default Prometheus text exposition
 * format — no other format is implemented (JSON-metrics is explicitly out
 * of scope per the spec's "JSON-only" REST rule, which applies to the
 * REST API surface, not the /metrics scrape endpoint).
 */
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsRegistry {
  readonly registry = new Registry();

  readonly httpRequestDuration = new Histogram({
    name: 'dumby_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly gatewayEventsShedTotal = new Counter({
    name: 'dumby_gateway_events_shed_total',
    help: 'Count of gateway events shed due to event-loop lag',
    labelNames: ['event_name'] as const,
    registers: [this.registry],
  });

  readonly eventBusCycleDetectedTotal = new Counter({
    name: 'dumby_event_bus_cycle_detected_total',
    help: 'Count of internal event bus cycle detections',
    registers: [this.registry],
  });

  readonly moduleLoadDurationSeconds = new Histogram({
    name: 'dumby_module_load_duration_seconds',
    help: 'Per-module onLoad duration',
    labelNames: ['module'] as const,
    registers: [this.registry],
  });

  readonly rateLimitFallbackActive = new Gauge({
    name: 'dumby_rate_limit_fallback_active',
    help: '1 while the in-memory rate-limit fallback is engaged due to a Redis outage',
    registers: [this.registry],
  });

  readonly cacheHitRatio = new Gauge({
    name: 'dumby_cache_hit_ratio',
    help: 'Rolling cache hit ratio (0-1); alert threshold is 0.8',
    labelNames: ['tier'] as const,
    registers: [this.registry],
  });

  readonly queueDepth = new Gauge({
    name: 'dumby_queue_depth',
    help: 'Current depth of a named BullMQ queue',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  readonly queueFailedJobsTotal = new Counter({
    name: 'dumby_queue_failed_jobs_total',
    help: 'Count of failed jobs per queue, used by the DLQMonitor alert threshold',
    labelNames: ['queue'] as const,
    registers: [this.registry],
  });

  readonly permissionDeniedTotal = new Counter({
    name: 'dumby_permission_denied_total',
    help: 'Count of permission denials by resolver layer',
    labelNames: ['layer'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'dumby_process_' });
  }

  async metricsText(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
