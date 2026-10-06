---
id: SPEC-06-OPERATIONS-0029
title: 29. Job Queue & Scheduling
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [JOB_QUEUE_SCHEDULING, JOBS_VS_TASKS_TWO, BULLMQ_ARCHITECTURE, IDEMPOTENCY_A_HARD_REQUIREMENT, RETRY_DEAD_LETTER_QUEUE, CONCURRENCY_AUTOSCALING, CRON_TASKS_DISTRIBUTED_LOCKING, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0029-1, ACC-OPS-0029-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 29. Job Queue & Scheduling

**Status:** [SPEC]

### 29.1 Jobs vs. Tasks — Two Different Authoring Models

```
TABLE 29-A — Jobs vs. tasks

                     Jobs                          Tasks
Manifest field       jobs — queueName + class      tasks — a class list
Trigger              enqueued programmatically,    registered into the scheduler at load
                     optionally delayed            time, fired on a cron expression
Base class           the processor base            the task base
Cardinality          one instance of work per      one firing per cron tick, fleet-wide
                     enqueue call — many           (never once per pod — see §29.6)
                     concurrent jobs
Failure handling     the queue's own retry + DLQ   logged and alerted; a missed tick is
                                                   not auto-retried — the next tick is
                                                   the natural recovery
```

A job is "do this one specific thing, once, possibly later" — deliver one reminder. A task is
"do this recurring maintenance sweep on a schedule" — for example, a task sweeping any mute
whose end time passed without its job firing, a safety net over the job path.

### 29.2 BullMQ Architecture

The queue manager maintains one BullMQ queue per registered queue name, backed by the shared
Redis instance. Processor subclasses register as BullMQ workers, each with a configurable
concurrency. Workers can run inside the main bot process or be split into dedicated worker-only
processes for CPU isolation when a queue's workload risks contending with the gateway's
event-loop needs.

### 29.3 Idempotency — A Hard Requirement, Not a Suggestion

BullMQ guarantees **at-least-once** delivery: a job may be processed more than once, for
example when a worker crashes after completing its work but before acknowledging it. Every
processor is therefore required **and framework-enforced** to be idempotent, via an
idempotency key tracked in the job data — safely re-runnable with the same payload, producing
no additional side effect beyond the first successful run. The canonical pattern is checking
the record's current status before acting and treating anything other than the expected
pre-condition state as "already handled." Setting a `jobId` deliberately at enqueue time makes
the enqueue itself idempotent, so a double-enqueue is a safe no-op.

### 29.4 Retry & Dead-Letter Queue

```
TABLE 29-B — Job retry defaults

attempts        3
backoff         exponential: 5 s, then 10 s, then 20 s
on exhaustion   moved to a dead-letter entry preserving the full payload and every
                attempt's failure reason — never silently dropped
```

A dead-lettered job is visible via the Power Engine's requeue control domain for inspection and
manual re-queueing.

### 29.5 Concurrency & Autoscaling

Each queue's worker concurrency is an explicit per-queue value, not a global setting —
lightweight I/O-bound queues (reminder delivery) can run high concurrency, while CPU-heavier
queues are kept lower to avoid starving the event loop. In Kubernetes, dedicated worker
processes scale horizontally via an autoscaler targeting **queue depth** rather than CPU
alone — a backing-up queue is a more direct capacity signal than CPU for an I/O-bound job
workload.

### 29.6 Cron Tasks & Distributed Locking

The scheduler is constructed at bootstrap Stage 08 alongside the queue connections, with every
registered cron task's consumer registered there — before any pod reports ready. A recurring
task must fire exactly once per tick **fleet-wide**. The scheduler guards every tick with the
identical distributed-lock pattern used for shard ownership: every pod attempts a short-TTL
`SET NX` on a key derived from the task name and the tick timestamp; exactly one succeeds and
executes, and the rest fail the `NX` check and skip with no retry.

### 29.7 How To Verify This Section Against the Code

- The queue manager, processor base, scheduler, and autoscaler:
  `apps/main/src/queue/queue-manager.ts`, `src/queue/base-processor.ts`,
  `src/queue/scheduler.ts`, `src/queue/autoscaler.ts`.
- The worker entrypoint: `apps/main/src/entry/worker.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0029-1
  check: "Every job processor is idempotent (safe to run twice)"
  test: tests/unit/job-idempotency.spec.ts
- id: ACC-OPS-0029-2
  check: "Exhausted jobs move to the DLQ; cron tasks take a Redlock before executing"
  test: tests/integration/jobs-dlq-lock.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities

**classes, interfaces & symbols:** `BaseTask`, `CPU-isolation`, `ExpiredMuteCleanupTask`, `N-pod`, `ReminderDeliveryJob`, `TPayload`, `taskName`, `tickTimestamp`

**events & identifiers:** `BaseProcessor.process`
