---
id: DOC-FEAT-OBSERVABILITY
title: Observability
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Observability

Three pillars — structured logs, metrics, and traces — unified by one correlation id.

**One correlation id, three signals.** Every command execution, job run, and HTTP request
generates a correlation id, bound to the command context by the trace middleware and attached
identically to every log line, trace span, and (as an exemplar) metric. Cross-signal
correlation is a lookup, never a time-window approximation.

**Structured logging.** Every log line is JSON to stdout — never plain-text interpolation — so
aggregation is queryable by field. One child logger per request scope is pre-bound with the
identifying fields. Credential redaction is enforced at the logger level, so a module logging a
whole payload cannot leak a secret.

**Metrics.** Command counters and latency histograms, cache hit/miss ratios, queue depth,
database-pool usage, shard gateway latency, and error counters — exposed as Prometheus text
format. Alerting rules built on these feed the SLO targets: command P95 latency, unexpected
error rate, cache hit ratio, queue depth, and Redis availability.

**Tracing.** A root span per command execution, with child spans for slow database queries, job
invocations, and outbound HTTP calls. The sample rate defaults to 0.1 — but a request that also
produces an error log line is sampled unconditionally, so a failing request is never sampled
out.

**The fourth signal** is the health endpoints (liveness, startup, readiness), the one an
orchestrator polls directly. Their gates map onto the bootstrap stages: liveness once
observability is up, startup once the gateway is connected, readiness only once every required
module is healthy.

See `spec/operations/` §27 and §33.5.
