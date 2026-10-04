---
id: SPEC-00-GOVERNANCE-0009
title: PART 7 — RELIABILITY, SECURITY & PERFORMANCE
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0009-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# PART 7 — RELIABILITY, SECURITY & PERFORMANCE

### D-7.1 — One Correlation ID, Three Signals

**Rule (MUST).** Every command execution, job run, and HTTP request generates
a correlation ID bound to the context by TraceMiddleware at priority 0. It is
attached identically to every log line (Pino child logger), every trace span
(OTel attribute), and — where the backend supports exemplars — the
corresponding metric observations, and propagated into job payload metadata
on deferral. Cross-signal correlation is a direct lookup, never a
time-window approximation. All logging is structured JSON to stdout; the
logger's redaction list is what enforces "secrets never logged" (P7) — it
MUST be maintained as new secret-shaped fields appear.

### D-7.2 — The Error Taxonomy Is Closed

**Rule (MUST).** Every recognized error extends `DumbyError`, carrying a
machine-readable code, an HTTP-equivalent classification, a `userMessage`
safe for an ephemeral reply, and an `isOperational` flag. The eight concrete
subclasses and their semantics:

````
ValidationError / PermissionDeniedError / NotFoundError /
ConflictError / RateLimitExceededError / ExternalServiceError
        → isOperational: true — expected, handled outcomes; reply with
          userMessage and move on.
ConfigurationError / InternalError
        → isOperational: false — something structurally wrong; logged with
          full context and alerted on. Includes circular dependencies,
          command-key collisions, and event-cycle errors.
````

The root error boundary branches on exactly this distinction; an unrecognized
thrown error is treated as the UNEXPECTED branch of InternalError.

### D-7.3 — Isolation Boundaries: One Failure Never Cascades

**Rule (MUST).** Per-handler isolation on gateway event dispatch, per-module
isolation on lifecycle failures, and per-job isolation in the queue: each
guarding path is wrapped so the owning boundary absorbs its own failure. A
failed module disables itself alone; the process keeps serving everything
else (P4, D-1.5).

### D-7.4 — Resilience Primitives

**Rule (MUST).** Circuit breakers and a retry policy back outbound
dependencies; event-loop lag is monitored and shedding kicks in under
sustained pressure; Discord 429 responses are handled per the documented
rate-limit discipline (respect retry-after, back off, never hammer). These
primitives exist in the core, not per-module.

### D-7.5 — Secrets and Credential Security

**Rule (MUST).**

1. Every secret is supplied exclusively through orchestrator-injected
   environment variables (Kubernetes Secrets sealed at rest, or a vault) —
   never committed, never baked into an image layer. `.env` files are
   gitignored unconditionally; CI secret scanning fails the build on any
   credential-like pattern, independent of developer discipline.
2. Rotating a secret (e.g., `BOT_TOKEN`) triggers an automated rolling
   restart, or is served through an external-secrets/Vault agent that
   hot-reloads — so no fleet-wide cutover leaves every pod holding an
   invalid token simultaneously.
3. Production credentials are categorically distinct from staging and
   development values — never shared, reused, or derived. This is the layer
   that gives the Admin-tier environment guard real force.
4. Input validation at every trust boundary (D-5.9 webhooks; command
   options; REST bodies; manifests; process config): no layer trusts data
   merely because it arrived from another layer inside the same process.
5. The operator-authored security policy lockfile (JSON) is checked at
   Stage 11; ESM loader import restrictions constrain what module code may
   load; the ESLint rule `no-direct-interaction-reply` keeps reply paths
   inside the governed pipeline.
6. Privilege-escalation vectors are blocked structurally, and the four
   documented blocked vectors stay blocked — new escalation paths found in
   review are defects, not features.

### D-7.6 — Performance and Scalability Posture

**Rule (MUST).**

1. Shard topology: each pod carries a contiguous shard range sized to stay
   well clear of Discord's per-shard limits (reference sizing ≈ 1,000
   guilds per shard); cross-shard routine coordination uses Redis pub/sub,
   and `broadcastEval()` is reserved for low-frequency, operator-triggered
   needs only.
2. Zero-downtime rolling updates: `maxUnavailable: 0` / `maxSurge: 1`; the
   new pod must complete all 18 bootstrap stages and flip readiness to 200
   before the old pod receives SIGTERM; shard locks hand off without a gap
   (D-3.8); a rollout progress deadline triggers automatic rollback rather
   than pausing for manual intervention.
3. Deployment hygiene: ≥ 2 replicas; HPA 2–10 on CPU 70% / memory 80%;
   probes on the health port; `runAsNonRoot` uid 1000;
   `automountServiceAccountToken: false`.
4. Canary validation for releases: differential analysis of new vs. old pods
   against SLO thresholds — error rate (< 2% target, ≥ 5% critical), P95
   latency (< 3000 ms target, ≥ 5000 ms critical), shard/queue/cache/DB
   health — with a minimum-sample guard and external-dependency correlation
   so a bad deploy rolls back without false positives.
5. SLO alerting thresholds are defined and wired; Core and Admin tier
   performance baselines (§13.8) hold.

### D-7.7 — Privacy and Data Protection

**Rule (MUST).** User-data erasure and the privacy/GDPR obligations of
blueprint §34 are implemented and testable: data minimization in what is
collected, documented retention (including audit-log retention), and an
erasure path that reaches the data a module persisted for a user. i18n,
data-erasure, and webhook-verification wiring are named gaps in the current
state — they are obligations, not options.

### D-7.8 — Known SPOFs Stay on the Books

**Rule (MUST).** The single Redis instance backing BullMQ remains
documented, monitored, and planned (pg-boss fallback deferred — an open,
tracked decision in the blueprint's audit register) — it MUST NOT be
silently accepted as permanent, nor silently "fixed" outside the ADR
process.

---

## Acceptance
```acceptance
- id: ACC-GOV-0009-1
  check: "Reliability/security/performance mandates hold (observability, secrets, SLOs)"
  test: tests/arch/ops-mandates.spec.ts
```
