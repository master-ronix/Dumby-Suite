---
id: SPEC-REF-INLINE-STATUS-LIFECYCLE
title: Inline Status & Design Entries — lifecycle
kind: spec
status: normative
version: 5.0.0
authority_scope: [reference]
contracts: []
acceptance: [ACC-REF-INLINE-lifecycle]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Inline status & design entries — lifecycle

Status, `Design Consideration`, and `§X Addition` entries the original reference interleaved inline, consolidated here verbatim for this department.

### 37.4.4 Vitest Configuration — Referenced but Location Unconfirmed

`vitest.config.ts` and `vitest.integration.config.ts` are referenced in `apps/main/package.json` test scripts, but their existence at the expected repo/app root location has not been confirmed. If these config files are missing or misplaced, test execution and coverage collection (§37.4) would fail silently or use defaults. The specification requires confirmation that both configs exist at `apps/main/vitest.config.ts` and `apps/main/vitest.integration.config.ts`, resolve correctly, and enforce the per-layer coverage thresholds defined in TABLE 37-B.

### 40.2.1 Happy-Path Smoke Test Tier — Selection Criteria Gap

The Happy-Path Smoke Test tier (§40.2) defines smoke tests as fast, per-PR suites covering the most common user journeys, but lacks precise selection criteria for what constitutes a qualifying "journey." The current definition is vague — "the most common 10–15 user journeys per module" — without specifying how journeys are selected, what coverage they must provide, or how they differ from E2E tests beyond speed. The specification requires an explicit selection criteria document defining: (1) what defines a "journey" (a single complete command invocation from input to response), (2) which journeys qualify (the top N by usage frequency from analytics), and (3) the boundary between smoke and E2E (smoke = happy path only, E2E = includes error branches).

### 40.2.1 Phase 7 CI/CD — Terraform Environment Roots (Incomplete)

Phase 7 (CI/CD, Docker, K8s, Terraform) is approximately 80% complete. All five GitHub Actions workflows are implemented and both deployment layouts (Docker and K8s) are functional. The remaining gap is that Terraform environment roots (`env/dev`, `env/staging`, `env/prod`) contain placeholder configuration rather than fully configured infrastructure definitions. The specification requires Terraform env roots with complete variable definitions, backend state configuration, provider blocks, and module references for each environment.

### §43 Addition — Known Failure Scenarios & Mitigations Appendix

A new "Infrastructure Failure Modes (Derived from Design)" section after runbooks (§43) or as an appendix, with a table of Failure Scenario | Detection | Mitigation | Reference.

### §43 Addition — Per-layer Vitest coverage thresholds

Independent per-layer thresholds matching the documented floors.

### 43.11 Release Manager Server-Side Apply with Field Manager

- Specified — server-side apply with field manager `release-manager`.
- Implemented server-side apply in Kubernetes rollout.

### 43.12 Developer Registration & Licensing (devId + approvalStatus)

- Partially Implemented — design documented; MFA and dev-token split flagged missing.
- MFA + split identity + per-version approval.

### 43.16 Event bus with cycle detection and protected domains

- EventBus (171L) with cycle detection (maxEmitDepth: 20, EventCycleError), protected event domains, priority ordering; tests exist. Gateway EventRouter and InternalEventBus kept separate.
- Maintain.

### 43.17 HTTP servers (API/health/metrics)

- Fully Implemented. `http/server.ts` (58–59L) — `buildApiServer` (helmet + rate-limit), `buildHealthServer`, `buildMetricsServer`; health routes (liveness/readiness/startup/probes), info, metrics (Prometheus).

### 43.18 I18nManager

- This is specified but not yet implemented. (outside its own folder).
- Wired.

### 43.19 Idempotent Deploy / No-Op Detection

- Confirmed.
- Implemented idempotency.

### 43.20 Mock Gateway Adapter and Mock Container for Testing

- Fully Implemented. The mock gateway adapter and mock container for testing show genuine testing discipline. They enable unit-testing a DI-heavy framework without external dependencies. The middleware test alone is 25KB.
- Maintain as-is; document the mock patterns for module authors to use in their own tests.

### 43.21 Module Hot-Swap (In-Process Reload via Shared Volume Symlink)

- Partially Implemented — design documented; in-process reload mechanism described; isolation/rollback gaps flagged.
- Safe hot-swap with isolation + canary + auto-rollback.

### 43.23 Module loader + topo-sort + Swastik loader

- Fully Implemented. `loader.ts` (140–141L, loadAll/readyAll/unloadAll/unload, fatal vs degraded), `topo-sort.ts` (89–90L, Kahn's algorithm, cycle detection), `manifest.schema.ts` (111–112L, Zod, 27+ fields), `tier-rules.ts` (67L), `swastik-loader.ts` (109–110L, dynamic import), `registry.ts` (43L).

### 43.24 Observability (Pino + prom-client + OTel)

- Fully Implemented. `logger.ts` (77L, Pino + redact), `metrics/registry.ts` (86L, prom-client, 5+ metrics: commands_total, rate_limit_rejections, permission_denials, cache_hits/misses, db_query_duration, module_load_duration), `tracing.ts` (56L, OTel SDK + OTLP). The tracing claim carries a recorded survey disagreement — one inventory records the SDK wiring, another flags it as not confirmed — noted here rather than silently resolved.

### 43.26 Proxy-Based Acknowledgement Guard In Command Router

- Fully Implemented. The command router uses a Proxy-based acknowledgement guard that auto-defers if a handler doesn't acknowledge within a timeout.
- Maintain as-is; make the timeout configurable per-command via manifest.

### 43.28 RetryPolicy

- This is specified but not yet implemented. (a simpler helper is used instead).
- Consolidated.

### 43.29 State Externalization (Shard-Ownership Lock + Graceful Degradation)

- Fully Implemented (per docs).
- Maintained.

### 43.30 `shouldEarlyRecompute` (probabilistic early refresh)

- This is specified but not yet implemented.
- Wired.

### 43.31 i18n (en-US)

- Fully Implemented. `i18n-manager.ts` (68–69L) — `register`, `t` with `{{param}}` interpolation, en-US fallback, `loadLocaleFile`, `buildBundle`; `formatters.ts` (22L). Notes: only en-US shipped (V1 scope).

### 43.32 pnpm minimumReleaseAge 1-Day Gate

- `pnpm-workspace.yaml` enforces a 1-day release-age gate with `minimumReleaseAgeExclude` override.
- The system maintains this; read the comment block before excluding.

### 43.33 7-layer permission resolver with fail-open/closed asymmetry

- resolver.ts (145L) + rbac.ts (77L) implement 7 layers (bot owner, blacklist, guild/module availability, channel restriction, Discord bitfield, RBAC role, explicit grant) with deliberate per-layer fail-open/fail-closed asymmetry; default-allow on fall-through; tests exist.
- The system maintains this; note no web dashboard shares it yet.

### 43.34 Module-level fault isolation (compliance #2)

- `CommandRouter` try/catch around `execute`; `EventRouter` per-handler try/catch; `ModuleLoader` fatal/degraded classification.
- Maintained; verified on the `CommandRouter` live path (§19.2's structural wiring test).

### 43.35 Power Engine dispatcher with unconditional audit logging

- power-engine-dispatcher.ts (112L) validates actorId/source/reason, rejects untrusted sources, writes an audit_logs entry for EVERY attempt (allowed or rejected) BEFORE handler execution.
- Maintain audit-as-precondition semantics.

### 43.36 Port-based dependency inversion (11 interfaces in core/commands/ports.ts)

- core/commands/ports.ts defines 11 interfaces that command services depend on, enabling testability without real infrastructure.
- Maintain.

### 43.37 Probabilistic Early Recompute (PER) algorithm

- The cache implements PER to proactively refresh hot keys before expiry, preventing stampede bursts.
- Maintain.

### 43.38 Scaffolding CLI

- Scaffolding CLI documented; no _template module found.
- CLI + _template present.

## Acceptance
```acceptance
- id: ACC-REF-INLINE-lifecycle
  check: "Every inline status/design entry is preserved verbatim for this department"
  test: tests/docs/inline-status-entries.spec.ts
```