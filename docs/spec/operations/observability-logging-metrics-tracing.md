---
id: SPEC-06-OPERATIONS-0027
title: 27. Observability — Logging, Metrics & Tracing
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [OBSERVABILITY_LOGGING_METRICS_TRAC, THREE_PILLARS_ONE_CORRELATION, STRUCTURED_LOGGING, DISTRIBUTED_CRON_LOCK_USAGE, METRICS, DISTRIBUTED_TRACING, HEALTH_ENDPOINTS_FULL_REFERENCE, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0027-1, ACC-OPS-0027-2, ACC-OPS-0027-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 27. Observability — Logging, Metrics & Tracing

**Status:** [SPEC]

### 27.1 Three Pillars, One Correlation ID

Every command execution, job run, and HTTP request generates a `correlationId` (UUID),
bound to the command context by the trace middleware at priority 0 (§19.2). The same id is
attached identically to every log line and every trace span, and is propagated into a job's
own payload metadata when work is deferred to the queue. Cross-signal correlation is
therefore a direct lookup — search one id across logs, traces, and metric exemplars — never
a post-hoc time-window approximation.

```
DIAGRAM 27-A — One correlationId, three signals

correlationId = uuid fans out to:
  (1) a Pino child logger bound with correlationId / guildId / userId / moduleId / shardId
  (2) an OpenTelemetry root span (attribute correlationId=…)
  (3) Prometheus labels (the trace id as an exemplar on the histogram observation, where
      the backend supports exemplars)
```

### 27.2 Structured Logging

**Pino is the sole logger.** Every log line is structured JSON to stdout — never plain-text
interpolation — so aggregation is queryable by field rather than by regex. One child logger
is created per request scope, pre-bound with the identifying fields and handed through the
command context; a module author never manually attaches the correlation id.

**Redaction is enforced at the logger level.** Configured as Pino `redact` paths with deep
wildcards — `*.token`, `*.*.token`, `*.password`, `*.secret`, `*.authorization`, `*.apiKey`,
`*.webhookUrl`, `*.signingKey`, and further-nested variants, matched case-insensitively —
credentials nested at any depth are scrubbed to `[REDACTED]` before serialization. Because
the scrub is at the logger, a module author logging a whole payload cannot leak a credential
— P7 made structural rather than a rule authors must remember.

```
TABLE 27-A — Log levels and usage

trace   per-middleware-layer entry/exit — targeted local debugging only, never deployed
        by default
debug   cache hit/miss detail, individual query timing below the slow threshold
info    command invocation start/success, job completion, lifecycle transitions (module
        load/unload, bootstrap stage completion)
warn    degraded-but-recovered: a rejected Admin-tier attempt, a slow query, a
        required:false module's onLoad failure
error   an unexpected error reaching the root error boundary, a critical query, a failed
        job that exhausted its retries
```

### 27.3 Metrics

`prom-client` exposes Prometheus text format from the metrics endpoint.

```
TABLE 27-B — Core metric families

dumby_commands_total              Counter    module, command, status
dumby_command_duration_seconds    Histogram  module, command
dumby_cache_requests_total        Counter    tier, result
dumby_errors_unexpected_total     Counter    module (where attributable)
dumby_queue_depth                 Gauge      queueName
dumby_queue_job_duration_seconds  Histogram  queueName, status
dumby_db_pool_active_connections  Gauge      —
dumby_db_query_duration_seconds   Histogram  table, operation
dumby_shard_gateway_latency_ms    Gauge      shardId
dumby_guild_module_active         Gauge      moduleSlug (fleet-wide count)
```

Alerting rules built on these feed the SLO targets: a sustained drop in cache-hit ratio, a
rise in the P99 latency bucket, or a nonzero climbing queue depth are each early, specific
signals — not a generic "something is wrong."

### 27.4 Distributed Tracing

Tracing is initialised during bootstrap Stage 04, configuring the SDK and its exporter before
any middleware or gateway activity. The trace middleware (priority 0) opens a real root span
per command execution and auto-instruments child spans for every database query above the
slow threshold, every job invocation, and every outbound HTTP call from a module's service
layer. Spans export via OTLP to any backend, configured purely through standard OTLP
environment variables.

The trace sample rate (default **0.1**) governs the fraction recorded in production — but
**every span of a request that also produces an error-level log line is sampled
unconditionally regardless of the rate**: a failing request is never sampled out.

### 27.5 Health Endpoints

The three health endpoints' relationship to the bootstrap sequence is specified in §8.3. In
observability terms they are the **fourth signal** alongside logs, metrics, and traces — the
one an orchestrator polls directly rather than a human querying during investigation.

### 27.6 Distributed Cron Lock Usage

Cron tasks acquire a distributed lock before execution so only one scheduler instance runs a
given job across replicas. Before dispatching a cron job, the scheduler issues a short-TTL
`SET NX` against the Redis lock store; if not acquired, the run is skipped. On completion the
holder releases only if its token matches — safe against a stale holder.

### 27.7 How To Verify This Section Against the Code

- The logger and its redaction config: `apps/main/src/logging/logger.ts`.
- The metrics registry: `apps/main/src/metrics/registry.ts`.
- Tracing initialisation: `apps/main/src/tracing/tracing.ts`.
- The distributed cron lock: `apps/main/src/queue/scheduler.ts`, `src/cache/redis-lock-store.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0027-1
  check: "One correlationId links every log line, trace span, and metrics exemplar for a request"
  test: tests/integration/correlation-id.spec.ts
- id: ACC-OPS-0027-2
  check: "Logs are structured JSON (Pino) with deep-wildcard secret redaction"
  test: tests/unit/log-redaction.spec.ts
- id: ACC-OPS-0027-3
  check: "OpenTelemetry tracing initializes at Stage 04 and metric families are exported"
  test: tests/integration/otel-init.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities (from the original reference)

The original reference named these entities in this section. They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `CloudWatch`, `Honeycomb`, `Jaeger`, `Loki`, `Tempo`, `initTracing`

**events & identifiers:** `CommandContext.logger`
