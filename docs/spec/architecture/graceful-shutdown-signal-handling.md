---
id: SPEC-02-ARCHITECTURE-0009
title: 9. Graceful Shutdown & Signal Handling
kind: spec
status: normative
version: 5.0.0
authority_scope: [02-architecture]
anchors: [GRACEFUL_SHUTDOWN_SIGNAL_HANDLING, THE_9_STEP_SHUTDOWN, RESTART_BEHAVIOR_UNDER_KUBERNETES, PROCESS_SIGNAL_REFERENCE, WHY_UNCAUGHTEXCEPTION_AND_UNHANDLE, FORWARD_ONLY_BOOTSTRAPPROGRESS_STA, SHARD_OWNERSHIP_LOCK_DURING, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-ARCH-0009-1, ACC-ARCH-0009-2, ACC-ARCH-0009-3]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 9. Graceful Shutdown & Signal Handling

**Status:** [SPEC]

### 9.1 The Nine-Step Shutdown Sequence

Triggered by `SIGTERM` or `SIGINT`, the shutdown runs nine steps sequentially, each with
its own independent timeout. A later step never starts before an earlier one completes or
exhausts its ceiling.

| St. | Action | Timeout | Notes |
|----|--------|---------|-------|
| 01 | Stop accepting new gateway events | 30 s | Shard disconnect; Discord marks the bot offline |
| 02 | Drain in-flight command executions | 30 s | Wait for active command executions to finish |
| 03 | Call `onUnload` on every loaded module, reverse load order | 30 s | Cancel timers, flush in-memory state |
| 04 | Drain the queues | 60 s | In-flight workers finish; workers still running after the ceiling are abandoned with a dead-letter entry |
| 05 | Close the HTTP server | 10 s | Finish in-flight requests |
| 06 | Flush the log buffer and the trace exporter | 5 s | No log lines or traces are lost |
| 07 | Close the queue connections | 5 s | |
| 08 | Close the Redis connection | 5 s | |
| 09 | Close the database connection pool | 5 s | |

**The worst-case sum of every ceiling is 180 seconds.** These are ceilings, not expected
durations: a shutdown with no long-running in-flight commands and a shallow queue backlog
completes in low single-digit seconds. The exact step list is declared in
`apps/main/src/bootstrap/stages.ts` (`SHUTDOWN_STEPS`), and the count is single-sourced in
`status/counts.json` (`shutdown_steps: 9`).

### 9.2 Why The Grace Period Is 190 Seconds

The termination grace period is set to 190 seconds — the 180-second worst case plus a
10-second buffer — specifically so that Step 04's dead-letter write for an abandoned job is
guaranteed to finish rather than being cut off mid-write by a `SIGKILL`. A shorter grace
period does not make the realistic case faster; it only removes the margin that keeps a
genuine worst-case shutdown from being killed before its own failure-recording step
completes. An operator whose workload never carries long-running commands or a deep queue
backlog, and who values faster pod recycling over guarding this tail case, can lower it
deliberately.

### 9.3 Restart Behaviour Under Kubernetes

However a restart is triggered — an Admin-tier command, an orchestrator pod delete — the
framework's response is identical: complete shutdown, then exit with code zero, causing
the container to exit cleanly. The orchestrator's restart policy brings the process back.
**No signal-based self-re-exec mechanism is used or required anywhere.**

### 9.4 Process Signal Reference

```
TABLE 9-B — Signals
```

- `SIGTERM` — pod termination or `docker stop` → the graceful shutdown sequence.
- `SIGINT` — Ctrl+C in development → the graceful shutdown sequence.
- `SIGUSR2` — reserved and structurally unused; no handler is ever registered. Every
  restart path resolves to the same exit-with-zero plus orchestrator-restart-policy path.
  Treat any "SIGUSR2 as a shutdown trigger" reference as informal shorthand for one of the
  two real triggers.
- `uncaughtException` — an unhandled throw at the process level → a bounded fatal
  sequence (below), then exit 1.
- `unhandledRejection` — an unhandled promise rejection → log at error level, emit the
  system event, and continue. Module-level rejections are caught by the middleware root
  error boundary (§19.4) before reaching here in normal operation.

### 9.5 Why `uncaughtException` and `unhandledRejection` Differ

- **`uncaughtException`** means internal state is no longer trustworthy — an invariant has
  been violated — so a full graceful drain risks compounding a bad state. The response,
  registered once at Stage 01, is bounded: write a fatal-level log entry carrying the
  error, stack, and current correlation ID; emit the fatal system event (consumed by the
  Admin tier for P0 alerting); attempt the graceful sequence under a **hard 15-second
  ceiling** — flush logs and traces, disable modules in tier order (Marketplace, Standard,
  Core, Admin), disconnect shards — then exit with code 1 whether or not the graceful path
  finished, letting the orchestrator start a fresh process.
- **`unhandledRejection`** does not imply a violated invariant — typically one async
  operation failed uncaught — so the default response is to log and continue. Terminating
  the whole process over one rejection would convert an isolated failure into a fleet-wide
  availability event.

Console output is structurally banned (ESLint `no-console`, with a single allow-listed
entry for the logging module's own sink), so an accidental `console.log` fails lint rather
than bypassing correlation-ID-carrying log lines.

### 9.6 Shard-Ownership Lock During Rolling Updates

Exactly one process holds the live gateway connection per shard, tracked as a Redis key
with a heartbeat TTL. During a rolling update, the incoming pod retries until the outgoing
pod releases the lock as part of graceful shutdown, so the handover is bounded by the
shutdown ceiling rather than by hope. The residual risk is a prolonged Redis outage, which
leaves shard ownership ambiguous — which is why Redis availability is a first-class SLO
target. The protocol — acquisition, heartbeat renewal, bounded retry, and the
`SHARD_LOCK_*` environment variables — is implemented under `apps/main/src/discord/`.

### 9.7 How To Verify This Section Against the Code

The nine steps and their order are `SHUTDOWN_STEPS` in `apps/main/src/bootstrap/stages.ts`;
the graceful sequence, the fatal handler, and the in-flight tracker are under
`apps/main/src/shutdown/`; the shard-ownership lock is under `apps/main/src/discord/`.
Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-ARCH-0009-1
  check: "SIGTERM/SIGINT runs exactly {{counts.shutdown_steps}} shutdown steps, each with an independent timeout"
  test: tests/integration/shutdown.steps.spec.ts
- id: ACC-ARCH-0009-2
  check: "Worst-case shutdown sum is 180 s and the process calls process.exit(0) at the end"
  test: tests/integration/shutdown.ceiling.spec.ts
- id: ACC-ARCH-0009-3
  check: "K8s `terminationGracePeriodSeconds` is 190 (180 s + 10 s buffer)"
  test: tests/arch/grace-period.spec.ts
```

## Edges (-> blueprint)
- SPEC-02-ARCHITECTURE-0009 -> SPEC-06-OPERATIONS (K8s terminationGracePeriodSeconds)

## Named entities

**classes, interfaces & symbols:** `Precision`, `Swastik-driven`, `dumby.system.unhandledRejection`
**files & artifacts:** `deploy/k8s/base/deployment.yaml`

