---
id: SPEC-06-OPERATIONS-0028
title: 28. Error Management & Fault Tolerance
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [ERROR_MANAGEMENT_FAULT_TOLERANCE, ERROR_TAXONOMY, MODULE_ISOLATION, RETRY_POLICY_IN_REQUEST, CIRCUIT_BREAKER, PROCESS_LEVEL_SAFETY_NETS, MAINTENANCE_MODE, THE_ERROR_HIERARCHY, PROCESS_LEVEL_FAILURE_HANDLING, RECOVERY_STRATEGIES, DISCORD_API_DEGRADATION_HANDLING, THE_BULKHEAD_PATTERN]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0028-1, ACC-OPS-0028-2, ACC-OPS-0028-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 28. Error Management & Fault Tolerance

**Status:** [SPEC]

### 28.1 The Error Taxonomy

The framework's base error carries a machine-readable `code`, an HTTP-status-equivalent for
logging and metrics classification, a `userMessage` safe for an ephemeral reply, and an
operational flag distinguishing an expected, handled failure from a genuine bug — the
distinction the root error boundary branches on (§19.4). Every user-visible failure surfaces
through the formal notice frame (§20.9): the buffer embed is edited into the merged
failure/maintenance/unknown-command presentation carrying a reason code plus the
interaction's trace correlation id. A failed command never leaves the buffer hanging and
never shows a raw error message.

```
TABLE 28-A — The concrete subclasses

ValidationError         400  malformed/out-of-bounds input, caught in the command layer
PermissionDeniedError   403  any authorization failure — engine Layers 4–7, or a
                             module-level check
NotFoundError           404  a referenced resource doesn't exist
ConflictError           409  a state conflict — double-processing, closing a closed case
RateLimitedError        429  the global limiter or a command's own cooldown
ExternalServiceError    502  a Discord REST call or a third-party integration failed
ConfigurationError      500  a startup-time / dependency-graph integrity violation —
                             parent of the cycle, collision, and event-cycle errors
InternalError           500  unexpected/uncategorized — the "unexpected" branch
```

The first six are operational — a normal expected outcome, reply with the user message and
move on. The last two default to non-operational: structurally wrong, logged with full
context and alerted, not treated as routine.

> **Code note.** The runtime taxonomy is a base class plus **14** concrete subclasses —
> including `UnauthorizedError`, `MaintenanceModeError`, `DependencyUnavailableError`,
> `EventCycleError`, `CommandCeilingExceededError`, and `CollisionPendingError` — each with
> its own code, HTTP status, and retryable flag. The specification's table above lists the
> eight most-used; `contracts/errors.json` carries the full fourteen, matching
> `apps/main/src/errors/taxonomy.ts` exactly (REC-006).

### 28.2 Module Isolation

Isolation is established at three places, on the identical philosophy that one failure never
cascades beyond its boundary.

```
TABLE 28-B — Isolation boundaries across the system

Command execution        the root error boundary catches everything inside one command's
                         pipeline — a failing command never affects a concurrent one
Gateway event handlers   the event router wraps each handler in its own try/catch — one
                         module's throwing handler never blocks another's for the same event
Module load/ready        a required:false module's onLoad/onReady failure disables that
                         module alone — startup and runtime both continue
```

The **five-vector leak model** — hot-reload zombies, silent event-bus subscribers, queue
worker retention, L1 cache orbiters, and orphaned closures retained by long-lived core
references — extends to the v5.0 surfaces: renderer per-render state is per-interaction and
unreferenced once the render is issued; buffer embeds hold no module references; tier-volume
promotions swap whole directories rather than mutating live module state; per-guild pub/sub
channels are cleaned up with the guild's cache namespace. Leak-regression suites run in CI on
every change touching an unload path, a reload path, or the renderer lifecycle.

### 28.3 Retry Policy — In-Request Utility vs. Job Retry

Two independent retry mechanisms, deliberately not unified because they solve different
problems.

```
TABLE 28-C — Two retry mechanisms, never composed

                        in-request utility        BullMQ job retry
Scope                   within a single           across a job's whole re-queue-and-
                        synchronous handler       re-execute lifecycle
Typical delay           sub-second to low seconds seconds to minutes
Use case                a flaky external call     a job whose entire attempt failed and
                        before the response       needs a fresh, later-scheduled attempt
                        window closes
Defaults                maxAttempts 3, base        attempts 3, exponential backoff
                        1000 ms, max 30 s, ±20%    5 s / 10 s / 20 s
                        jitter
Never composes          a handler retrying a call that itself lives inside a job processor
                        would double the retry surface — never nest one inside the other
                        for the same operation
```

Jitter prevents many concurrent requests hitting the same transient failure from retrying in
lockstep and re-creating the load spike.

### 28.4 Circuit Breaker

A service wrapping an external dependency can apply a circuit breaker to stop calling a
downstream system that has already demonstrated it is failing.

```
DIAGRAM 28-A — Circuit breaker state machine

failure rate ≥ 50% over the last 20 requests
  CLOSED → OPEN     calls fail immediately with ExternalServiceError — no network call
                    attempted (protects the failing dependency and this process)
  after 30 s
  OPEN → HALF_OPEN  one trial call permitted
  trial succeeds → CLOSED ; trial fails → OPEN again
```

### 28.5 Process-Level Safety Nets — Event Loop Lag Shedding

Beyond the signal handlers (§9.4), the application monitors event-loop lag continuously. Once
lag exceeds the shed threshold (default **50 ms**), the process enters load-shedding: new
interaction acknowledgments are prioritised over background and non-critical work (scheduled
task ticks and low-priority queue consumption are throttled) until lag returns under the
threshold. Incoming gateway events are triaged by domain: **protected domains** —
interactions already acknowledged, commands in flight, shutdown writes, audit writes — are
never shed; **unprotected domains** are dropped while lag persists. Every shed event
increments a counter at its increment site in the dispatch path, so the volume of
deliberately dropped work is a first-class alertable metric.

### 28.6 Maintenance Mode

A global Redis-backed flag, set and cleared exclusively through the Power Engine's
maintenance control domains, checked by the maintenance-mode middleware at priority **−20** —
the outermost layer of the entire pipeline. While set, every command's buffer embed is edited
into the formal notice frame with reason code `MAINTENANCE` — the same merged frame and
reason-code-plus-correlation-id discipline used for handler failures and unknown commands.
Only a small, explicitly allow-listed set of Admin-tier commands (capable of managing
maintenance mode itself) is exempted, so an operator is never locked out; with the main bot's
complete DM prohibition, this allow-list plus the control plane is the verified
lockout-avoidance path. The flag is mirrored in Redis and every pod observes the mirror via a
short-interval poller backed by the same invalidation pub/sub the cache uses — propagation
without restart. Exiting maintenance re-runs module readiness before readiness returns 200
again.

### 28.7 The Error Hierarchy by Recovery Strategy

Errors are classified by type and recovery strategy. Each carries a correlation id, a
timestamp, a module name, and a user-facing message.

- **Transient** — a temporary failure likely to resolve on retry (network timeouts,
  connection resets). Retried up to 3 times with exponential backoff and jitter; no circuit
  breaker; no alert.
- **Rate limit** — Discord 429, carrying `retry_after`. Retried after that interval; no
  circuit breaker; warned. Admin-tier requests are queued but not bypassed — Discord's hard
  limit applies to all tiers.
- **Validation** — invalid user input. Not retried; descriptive user message.
- **Permission** — the user lacks permission. Not retried; expected, not alerted.
- **Module** — a handler threw an unhandled exception. Not retried; the circuit breaker trips
  after the tier's error threshold. Tier-specific alerts: Admin 3 errors → P0; Core 5 → P1
  plus degraded mode; Standard/Marketplace 10 → P2 plus auto-disable.
- **Dependency** — a required dependency (database, Redis) is unavailable. Retried 3 times,
  then the circuit opens. Alerts scale by tier.
- **Fatal** — an unrecoverable process-level error (OOM, unhandled rejection). Not retried;
  no circuit breaker (the process is terminating); P0 alert all tiers; restart handled by the
  orchestrator.

### 28.8 Process-Level Failure Handling

Global handlers for unhandled rejections and uncaught exceptions log at fatal level with the
full stack and correlation id, emit a fatal internal event (consumed by the Admin tier for P0
alerting), and attempt a graceful shutdown under a **15-second ceiling** — disabling modules
in tier order (Marketplace, Standard, Core, Admin), finishing in-flight requests, and
disconnecting shards. If the graceful path exceeds 15 seconds, the process force-exits with
code 1 and the orchestrator restarts the pod.

### 28.9 Discord API Degradation Handling

When the API is degraded (gateway disconnects, REST 5xx, persistent rate limits), the gateway
client reconnects with exponential backoff. If reconnection fails after three attempts the
bot enters a **gateway-down mode**: all event processing pauses, the control-plane surface
shows a "Discord connection lost" banner, and the bot owner is alerted. The REST client
queues requests and drains them through a **per-priority queue** — Admin and Core ahead of
Standard, Marketplace last. If the queue exceeds 1,000 pending requests, non-critical
requests are dropped. The gateway is maintained separately from REST: if REST is degraded but
the gateway is connected, the bot still receives and processes events — it simply cannot send
responses.

### 28.10 The Bulkhead Pattern

Resources are isolated by tier so one tier's failure cannot consume another's. The HTTP
bulkhead gives Admin/Core a dedicated pool, Standard a max of 50 concurrent, and Marketplace
a max of 10 concurrent per guild (an exhausted pool queues rather than fails). The database
bulkhead gives Admin/Core a reserved portion, Standard the shared pool, and Marketplace a
limited portion of the shared pool, so an exhausted shared pool rejects Marketplace queries
first. The event-bus bulkhead delivers Admin/Core handlers from a high-priority queue and
Standard/Marketplace from a low-priority one; if the low-priority queue fills, events are
dropped (Marketplace first, then Standard) while the high-priority queue is never affected.

### 28.11 The Timeout Pattern

Every external operation has a timeout. HTTP defaults to 30 seconds (Marketplace modules 10
seconds). The database defaults to 30 seconds (a statement timeout cancels a runaway query).
Redis defaults to 5 seconds, after which the cache degrades to L1 only and retries the
connection. A command handler has no explicit timeout — the 15-minute Discord follow-up window
is the hard limit, with a follow-up watchdog arming at **13 minutes** (the interaction window
minus a two-minute response margin) that fires a warning and attempts a graceful "still
working" follow-up. An event handler should complete within 100 ms (Core) or 500 ms
(Standard/Marketplace); beyond 5 seconds it is forcefully terminated and the module's error
counter is incremented. A job handler defaults to 5 minutes.

### 28.12 The Graceful Degradation Pattern

Under a database outage the system switches to read-only: read commands work from cache, write
commands fail with a clear message, and the connection is retried every 10 seconds. Under a
Redis outage the cache becomes L1-only, rate limiting falls back to in-process counting (less
accurate, per-process rather than per-cluster), the event bus switches to in-process delivery,
and the job queue pauses (it cannot enqueue or process without Redis), retrying Redis every 30
seconds. Under a Discord API degradation, responses queue and send when the API recovers,
with non-critical responses dropped if the queue exceeds 1,000.

### 28.13 The Circuit Breaker Pattern — Detailed Implementation

Three states — closed, open, half-open. The decision uses a **rolling window, not a
consecutive-failure count**: it keeps the outcomes of the last 20 calls per dependency and
opens when at least 50% of the window failed, so intermittent-but-mostly-succeeding traffic
never opens while consistently-failing traffic always does. On open, all requests fail
immediately with a typed circuit-open error — a member of the taxonomy with its own recovery
strategy, so a caller can distinguish "tripped" from "just failed" — and no network call is
made. Open transitions to half-open after a **30-second cooldown**, which permits one request;
success closes the circuit, failure reopens it and restarts the cooldown. Failures are tracked
**by dependency**, so one dependency's failure does not trip another's (a database outage does
not stop a command served from cache).

### 28.14 The Idempotency Pattern

Processing the same operation multiple times must equal processing it once — essential for
at-least-once delivery. Implemented at the event-handler level: each event carries a unique id
generated by the publisher, and an optional per-subscription deduplicator tracks ids in a
Redis set with a 5-minute TTL; a delivery whose id is already in the set is skipped.
Modules can implement their own idempotency too (a levelling module checks the database for
the message id before awarding experience, since the gateway may resend events after a
reconnection).

### 28.15 How To Verify This Section Against the Code

- The error taxonomy: `apps/main/src/errors/taxonomy.ts`.
- The retry policy and circuit breaker: `apps/main/src/resilience/retry-policy.ts`,
  `src/resilience/circuit-breaker.ts`.
- The fatal handler and in-flight tracker: `apps/main/src/shutdown/fatal-handler.ts`,
  `src/shutdown/in-flight-tracker.ts`.
- Event-loop lag shedding: `apps/main/src/events/event-loop-lag.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0028-1
  check: "Every recognized error extends DumbyError with code, HTTP-status-equivalent, userMessage, and isOperational"
  test: tests/unit/error-taxonomy.spec.ts
- id: ACC-OPS-0028-2
  check: "The concrete subclass set matches contracts/errors.json"
  test: tests/arch/error-classes-match-contract.spec.ts
- id: ACC-OPS-0028-3
  check: "Every user-visible failure renders the formal notice frame, never a raw error message"
  test: tests/integration/failure-notice.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `CircuitBreaker`, `DI-scoped`, `Discord-degraded`, `EventDeduplicator`, `Please`, `QuotaEnforcingDatabaseService`, `Redis-based`, `Shift`, `baseDelayMs`, `maxDelayMs`

**error classes:** `CircuitOpenError`, `CircularDependencyError`, `CommandKeyCollisionError`, `DependencyError`, `FatalError`, `FrameworkError`, `ModuleError`, `PermissionError`, `RateLimitError`, `TimeoutError`, `TransientError`

**config/env constants:** `INTERACTION_TIMEOUT`, `MEMORY_LEAK_THRESHOLD_KB`, `REMINDERS_UNPARSEABLE_TIME`

**events & identifiers:** `onUnload.`, `uncaughtException.`
**files & artifacts:** `src/shared/utils/retry.ts`

