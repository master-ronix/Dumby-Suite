---
id: ORCHESTRATION-MASTER-PROMPT-MD
title: Master Build Prompt
kind: engine
status: engine
version: 5.2.0
chain_role: build
preceded_by: prompts/meta-prompt.md (State A)
handoff_to: upgradation/change-log.md
change_log: upgradation/change-log.md
---

# DUMBY — Master Build Prompt

## 1. Identity

- **Chain role:** *build* — the build protocol of the trigger chain.
- **Preceded by:** `prompts/meta-prompt.md` (activation), which hands off here on **State A (greenfield)**; it may also be invoked directly as a build request.
- **Hands off to:** `upgradation/change-log.md` (every phase and remediation records itself there), then returns to `prompts/meta-prompt.md`.
- **Authority:** `spec/` is the sole architectural authority. The precedence order is stated once, in `spec/governance/directive-charter-how-to-use-this-document.md`, and is cited, never restated. The `adr/` series binds the choices it governs; the frozen request records in `upgradation/` are provenance, never build specifications.

## 2. Purpose

Take a greenfield workspace **or** any partially-complete codebase to a verified, deployable Dumby application at full specification compliance — detecting what exists, what is missing, what is faulty, and what is not working, then driving the codebase to full compliance. It handles all three starting states: the phases below are the target sequence, and in State B the run enters that sequence at the phase matching the highest-complete subsystem and remediates everything below and around it. In State C there is no delta to land: the run is pure enforcement — the corpus is verified against the codebase from start to end, one file at a time, at a paced rate, and every deviation is remediated or recorded.

Context-window optimization governs the design: this document contains zero content from the source documents. Every technical specification lives in the document that owns it and is loaded on demand, per phase — never in bulk. Where a build choice is governed by a recorded decision, the governing ADR in `adr/` is read before the choice, never in bulk.

**Document type:** Master Build Prompt — orchestration brief that takes an implementer from empty workspace OR any partially-complete codebase to a verified, deployable Dumby bot at 100% specification compliance.

**Project:** Dumby — Discord Unified Modular Bot System

**Derived from:** The Dumby documentation corpus at version 5.0.0 (Consolidated Re-Baseline) in `docs/` — with `spec/` 5.0.0 (Consolidated Re-Baseline Edition) as the sole architectural authority — together with the ADR series in `adr/` and the frozen request records in `upgradation/`.

**Governing objective:** Following this prompt end-to-end MUST yield a finished, deployable, ready-to-use Dumby bot — regardless of whether the starting point is an empty workspace or a partially-built codebase. The prompt detects what exists, what is missing, what is faulty, and what is not working — then drives the codebase to full compliance with the specification.

**Output location:** The main project is built inside `apps/main/`; the `swastik` module-authoring package is built inside `packages/swastik/`. All source documents remain in `docs/` — the document set plus the `adr/` decision records and the frozen `ur/` request records — as the permanent reference set.

**First priority:** Context window optimization. This prompt contains zero content from the source documents. It is pure orchestration — detection logic, remediation protocol, and phase sequencing. Every technical specification lives in the document that owns it. Source documents are loaded on demand, per phase, never in bulk. Where a build choice is governed by a recorded decision, the governing ADR in `adr/` is one of those on-demand sources — read it before making the choice it governs, never in bulk.

## 3. Preconditions

- Invoked by `prompts/meta-prompt.md` with State A, or directly as a build request.
- The authority layer (`manifest.json`, `spec/`, `contracts/`, `status/`) is readable.
- The state probe has been run per `prompts/entry.md`; `apps/main/` is empty or absent for a pure greenfield run.

## 4. Inputs

| Input | Path | Use |
|-------|------|-----|
| Corpus manifest | `manifest.json` | the normative artifact set |
| Governance precedence | `spec/governance/directive-charter-how-to-use-this-document.md` | the authority order |
| Department specs | `spec/<department>/` | behavioural source, loaded per phase |
| Wiring | `blueprint/` | how subsystems connect, coordinate, and stay compatible |
| Wiki / API book | `documentation/` | what each part is and how to use it |
| Contracts | `contracts/` | machine-readable interfaces |
| Capability ledger | `status/capabilities.json` | build / defer / do-not-re-implement |
| Decisions | `adr/` | binding decisions |
| Change log | `upgradation/change-log.md` | history, defect lifecycle, records |
| Archived legacy | `archive/v4.5.1/documentation.md` | inherited decisions only |

## 5. Ordered Steps

The protocol executes as the ordered sections below; their internal numbering (0–6) is retained so the cross-references within the protocol resolve.

### 0. HOW TO USE THIS PROMPT

#### 0.1 Entry Point: Detect Your Starting State

Before doing anything else, determine which of these three states applies (the deterministic procedure is `prompts/entry.md`):

**State A — Greenfield:** `apps/main/` does not exist or is empty. Begin at Phase 0 of the build plan (§5). Build from scratch following the phased sequence.

**State B — Migration (an active work order exists):** `apps/main/` contains code **and** a request work order is active — at least one `upgradation/UR-*.md`, or open items in the live `migration-ledger.md`. Do **not** run this prompt's build or enforcement protocol yet: the delta protocol in `migration/migration-prompt.md` governs until every work-order item is `DONE`. This prompt's audit and enforcement become the governing protocol again only then.

**State C — Enforcement (code present, no active work order):** `apps/main/` contains code **and** no work order is active. Do NOT start at Phase 0 and do NOT run the migration protocol. Enter directly at the Codebase State Detection & Audit Protocol (§3), remediate the gaps (§4), and close with the Enforcement Pass (§6) — the whole codebase verified against `spec/`, `blueprint/`, and `documentation/`, file by file, at a paced rate that checkpoints and resumes. This is the steady state of a mature repository, and the route the chain falls through to when there is nothing to build and nothing to migrate.

This prompt handles all three states. The phases in §5 are the target sequence — in State B and State C you do not enter at Phase 0; you use the audit results to drive everything to compliance, and every phase's verification criteria are still checked in the final enforcement pass (§6).

#### 0.2 Core Principle

This prompt does not reproduce, summarize, or paraphrase specifications from the source documents. Every technical detail — architecture, schemas, stage sequences, middleware orderings, permission layers, database tables, interface layouts, defect descriptions, engineering rules, environment variables, error taxonomies, acceptance criteria — lives in the document that owns it.

This prompt provides three things the source documents do not: (1) a method for auditing any codebase state against the specification, (2) a remediation protocol for driving gaps to closure, and (3) a phased execution sequence that works from any starting point.

#### 0.3 Precedence Order

The canonical document-precedence order is stated once, in `spec/governance/` (§0.2); this prompt cites it rather than restating it. When any two source documents appear to conflict, the higher-precedence document wins, the conflict is recorded in `upgradation/change-log.md`, and the higher-precedence reading is taken. The ADRs in `adr/` are binding on the build choices they govern — where an ADR covers a choice you are about to make, the recorded decision wins over any contrary reading of prose elsewhere in the set. The frozen request records in `upgradation/` are provenance — they explain why the documentation reads as it does; they are never build specifications.

#### 0.4 Build Discipline

- Read the named source sections *before* implementing or remediating a subsystem. Never work from assumption — work from the specification.
- Where an ADR in `adr/` governs a build choice, read it before implementing that choice. A deviation from a recorded decision is a defect to fix or a judgment to record in `upgradation/change-log.md` — never a silent override.
- Use the canonical vocabulary everywhere — code, tests, commit messages, and docs alike. The persona system is **Twill** (bring-your-own-identity, single-server-bound). The release-management service is the **Release Manager**. The rank names are **MODERATOR** and **ADMINISTRATOR**. No legacy names, no shorthand variants.
- Each phase or remediation item must be verifiable before moving on.
- Write tests alongside implementation. For remediation, update or write tests that prove the fault is fixed.
- Never skip the middleware pipeline or permission resolver "to get it working." A bypass is a defect to fix, not a shortcut to take.
- Every file created or modified must trace to a requirement in a source document.
- Where a source document self-reports an implementation status gap, the build addresses it honestly — see the change-log's defect lifecycle and the directive's status-honesty rule.

---

### 1. MISSION & SCOPE

#### 1.1 What You Are Building

A production-ready, deployable Dumby bot application — a single TypeScript process that connects to the Discord gateway, serves a defined set of slash commands through the module system, presents every user-facing surface through the core Renderer, persists state to PostgreSQL and Redis, and passes its own acceptance gate.

The application is built as a pnpm monorepo workspace member at `apps/main/`, alongside the `swastik` module-authoring package at `packages/swastik/`.

#### 1.2 Three-Tier Build Scope

| Tier | What It Means | Delivered? |
|------|---------------|------------|
| **Core Framework** | Bootstrap, DI, module system, middleware, permissions, data layer, cache, queue, observability, shutdown, the core Renderer | YES — full implementation |
| **Shipped Modules** | The modules that constitute the user-facing surface on delivery | YES — the Core Command Surface specified in `spec/request-layer/` |
| **Control-Plane Services** | Power Engine, CLAI, Swastik, Credentials Service, Personas (Twill) | SCAFFOLD ONLY — typed interfaces and entry points; no operational implementation |

#### 1.3 Non-Goals

The framework's non-goals are specified in full in `spec/foundations/non-goals-explicit-boundaries.md` and `spec/governance/` (rule D-1.4). The build MUST NOT recreate any of those outcomes. Read those sections before starting or remediating.

#### 1.4 Inherited Open Items

Known gaps from the specification's history are documented in `upgradation/change-log.md` (Cross-Version Defect Lifecycle and Open Items sections). The build must address them honestly, not paper over them. Read those sections before starting or remediating.

---

### 2. SOURCE DOCUMENT AUTHORITY

#### 2.1 Document Map

| Document (new home) | Role |
|----------|------|
| `spec/` | Sole architectural authority — Consolidated Re-Baseline Edition |
| `spec/governance/` | Imperative rules (MUST/SHOULD/MAY) and the ban registry |
| `spec/request-layer/` | End-user interface specification — renderer grammar, Modes D/M/C, the Core Command Surface |
| `spec/architecture/directory-file-structure.md` | Canonical folder tree — every directory annotated |
| `documentation/overview/` | Ideological foundation and glossary |
| `upgradation/change-log.md` | Version history, defect lifecycle, open items |
| `spec/orientation/definitions.md` | Document intent, impact, purpose, definition for the full document set |
| `archive/v4.5.1/documentation.md` | Archived legacy reference — frozen; retained for inherited decisions only |
| `orchestration/master-prompt.md` | This document — the orchestration brief |
| `adr/` | ADR series — recorded decisions, binding on the build choices they govern |
| `upgradation/` | Frozen request records — provenance for the v5.0.0 re-baseline |

#### 2.2 Subsystem-to-Document Loading Guide

When implementing, auditing, or remediating a specific subsystem, read the department spec(s) listed below. The frozen legacy record is `archive/v4.5.1/documentation.md` — consult it for inherited decisions only; `spec/` governs on any conflict. Where a row's build choice is governed by an ADR, read that ADR from `adr/` before implementing.

| Subsystem | Spec home |
|-----------|-----------|
| Bootstrap | `spec/architecture/application-bootstrap-lifecycle.md` |
| Shutdown | `spec/architecture/graceful-shutdown-signal-handling.md` |
| DI Container | `spec/architecture/dependency-injection-service-container.md` |
| System architecture | `spec/architecture/system-architecture.md` |
| Technology stack | `spec/architecture/technology-stack-decision-matrix.md` |
| Module System | `spec/modules/module-anatomy-manifest.md`, `spec/modules/module-tiers-lifecycle.md`, `spec/modules/inter-module-communication-and-contracts.md` |
| Tier Volumes & Blind Discovery | `spec/modules/module-tiers-lifecycle.md` |
| Swastik (staging, promotion, hot reload) | `spec/modules/swastik-hot-reload-dynamic-module-management.md` |
| Marketplace / MDIS | `spec/modules/marketplace-and-mdis.md` |
| Command Framework | `spec/request-layer/command-framework-routing-engine.md` |
| Event Architecture | `spec/request-layer/event-architecture-bus-system.md` |
| Middleware Pipeline | `spec/request-layer/middleware-pipeline-interceptors.md` |
| Interaction Handling | `spec/request-layer/interaction-component-handling.md` |
| Renderer & Presentation Grammar | `spec/request-layer/division-1-the-renderer-presentation-authority.md` |
| Buffer Embed & Formal Notice Frame | `spec/request-layer/division-2-interaction-lifecycle-buffer-notices-components.md` |
| Permission Engine | `spec/request-layer/permission-authorization-engine.md` |
| Power Engine / CLAI / Credentials | `spec/request-layer/control-plane-services.md` |
| Configuration | `spec/data/configuration-management.md` |
| Database | `spec/data/database-architecture.md` |
| Caching | `spec/data/caching-architecture.md` |
| State Externalization | `spec/data/state-externalization-horizontal-scaling.md` |
| Observability | `spec/operations/observability-logging-metrics-tracing.md` |
| Error Management | `spec/operations/error-management-fault-tolerance.md` |
| Job Queue | `spec/operations/job-queue-scheduling.md` |
| Localization | `spec/operations/localization-internationalization.md` |
| Security | `spec/operations/security-architecture-threat-model.md` |
| Performance | `spec/operations/performance-scalability-engineering.md` |
| Privacy / GDPR | `spec/operations/privacy-gdpr-compliance.md` |
| Personas (Twill) | `spec/operations/multi-identity-operation-twill-personas.md` |
| Testing | `spec/lifecycle/testing-architecture-qa.md` |
| CI/CD | `spec/lifecycle/ci-cd-pipeline.md` |
| Infrastructure | `spec/lifecycle/infrastructure-deployment.md` |
| Versioning & Release | `spec/lifecycle/versioning-release-migration.md` |
| Troubleshooting | `spec/lifecycle/troubleshooting-operational-runbooks.md` |
| Governance rules | `spec/governance/` |
| Non-goals | `spec/foundations/non-goals-explicit-boundaries.md` |

The renderer grammar itself — the static Components v2 frame, dynamic slots, Modes D/M/C, the buffer embed, the formal notice frame, the title and attribution grammar, and the accent token — is owned by `spec/request-layer/`; read its renderer and interaction-lifecycle sections alongside the rows above whenever presentation behavior is in scope.

---

### 3. CODEBASE STATE DETECTION & AUDIT PROTOCOL

**Execute this section when the codebase already exists.** The output is a Gap Manifest — a classified inventory of every subsystem's actual state against the specification.

#### 3.1 The Four-State Classification

Every subsystem, file, behavior, and deliverable in the codebase is classified into exactly one of four states:

| State | Meaning | Action Required |
|-------|---------|-----------------|
| `COMPLETE` | Exists, compiles, passes its tests, and behaves per specification | None — verify only |
| `FAULTY` | Exists but behaves incorrectly, or contradicts the specification | Fix — remediate the fault |
| `PARTIAL` | Exists but is incomplete — some specified elements are missing | Complete — fill the gap |
| `MISSING` | Does not exist in the codebase at all | Build — implement from specification |

#### 3.2 Structural vs Behavioral Detection

For every subsystem, check two independent dimensions:

**Structural detection** (does the thing exist?):
- Does the directory exist per `spec/architecture/directory-file-structure.md`'s canonical layout?
- Do the files exist at the specified paths?
- Does the code compile (`tsc --noEmit`)?
- Do the declared dependencies exist in `package.json`?
- Are the ESLint rules, repository-root CI workflows, Docker/K8s manifests present?

**Behavioral detection** (does the thing work as specified?):
- Does the bootstrap actually complete its full stage sequence in order?
- Is the PermissionResolver actually invoked on every command dispatch — not merely registered in DI?
- Does every interaction actually pass through the full middleware pipeline — all twelve built-in middlewares live on the dispatch path, not merely defined as files somewhere?
- Does every interaction actually receive the instant buffer embed, edited into the final render or the formal notice frame — not merely have a buffer helper defined that nothing calls?
- Do formal notices actually carry reason codes and a trace correlation ID?
- Is any classic `EmbedBuilder`/`MessageEmbed` construction reachable anywhere in the codebase — the embed ban is absolute; renderer-issued Components v2 is the only presentation path?
- Does the main bot ever send a direct message — the DM prohibition is absolute?
- Do all migrations actually have working `down()` functions — not merely exist as files?
- Do all shipped commands actually respond with the exact formatting specified in `spec/request-layer/` — not merely exist as command files?
- Does the rate limiter actually fail closed on Redis outage — not merely have a fallback file?
- Does the event bus actually enforce its cycle-depth guard — not merely have the constant defined?
- Does the health endpoint actually return 503 before bootstrap completion and 200 after — not merely exist as a route?

**A subsystem that is structurally present but behaviorally absent is `FAULTY`, not `COMPLETE`.** This is the most common and most dangerous gap in a partially-complete codebase: files exist, but the wiring that makes them live is missing.

#### 3.3 The Audit Procedure

Execute in this order:

**Step 1 — Compile check.** Run `tsc --noEmit` (or the project's typecheck command). If it fails, catalog every error. All affected subsystems are immediately `FAULTY` or `PARTIAL` pending inspection.

**Step 2 — Test run.** Run the full test suite (`vitest run` or equivalent). Catalog every failure and every skip. Failed tests mark their subsystem `FAULTY`. Missing tests mark their subsystem `PARTIAL` (tests are a specified deliverable).

**Step 3 — Structural inventory.** Walk the subsystem-to-document loading guide (§2.2). For each subsystem:
- Check the source directories exist per `spec/architecture/directory-file-structure.md`
- Check the key files exist (entry points, manifest schemas, middleware definitions, migration files, repository base classes, etc.)
- Check that feature modules live on the four per-tier volumes rooted at `MODULES_DIR` (default `/mnt/modules`) — any module code living under `src/` is `FAULTY` and must be relocated to its tier volume
- Check that the CI workflows live in `.github/` at the repository root — a `.github/` nested under `apps/main/` is inert and therefore `FAULTY`
- Check for the presence of any duplicate or orphaned subsystem (a second command router, a legacy wrapper directory, tests for code that is not wired — these are `FAULTY` and must be removed or consolidated per the one-canonical-path rule)

**Step 4 — Behavioral verification.** For each subsystem that passed structural checks, verify behavior against the specification:
- Read the specification sections from §2.2 for that subsystem
- Trace the actual execution path in the code: does the dispatch reach the middleware pipeline? does the pipeline reach the permission resolver? does the resolver actually get called with the right arguments?
- Run the process (or its tests) and observe: does bootstrap complete? does shutdown respect its ceilings? do commands respond with correct formatting?
- Where you cannot run the process, write a test that proves the behavior — this is itself a specified deliverable

**Step 5 — Known-defect check.** Read `upgradation/change-log.md`'s Cross-Version Defect Lifecycle table. For every defect listed there, check whether the codebase replicates the defect (e.g., an orphaned router bypassing the pipeline, a permission resolver with no callers, a webhook check-then-write race, a rate limiter that fails open). Any replicated defect marks the affected subsystem `FAULTY`.

**Step 6 — Interface conformance check.** Read `spec/request-layer/` completely. For every command, page layout, button, dropdown, banner specification, title format, emoji rule, and interaction pattern specified there, verify the codebase's implementation matches exactly. Any deviation is `FAULTY`.

**Step 7 — Produce the Gap Manifest.** Compile the results into a structured inventory:

```
GAP MANIFEST
════════════

Subsystem: Bootstrap
  State: PARTIAL
  Structural: directory exists, 14 of 18 stages implemented
  Behavioral: stage ordering enforced, but health-server stage starts late
  Missing: stages per blueprint §8 — read for the full sequence
  Faulty: none
  Action: complete remaining stages; fix health-server ordering

Subsystem: Permission Engine
  State: FAULTY
  Structural: resolver, RBAC, blacklist all exist and compile
  Behavioral: resolver registered in DI but invoked on 0% of dispatch paths
  Faulty: dispatch bypasses the resolver entirely
  Action: wire the resolver into the middleware pipeline as a mandatory stage

...
```

The Gap Manifest is the working document for the Remediation Protocol (§4).

#### 3.4 Severity Ordering for Remediation

When the Gap Manifest contains multiple items, remediate in this order:

1. **Compile-blocking faults** — nothing else can be verified until the code compiles
2. **Known-defect replications** — the change-log's defect lifecycle items, because these are pre-analyzed faults with documented resolutions
3. **Core framework gaps** (bootstrap, DI, module system, middleware, permissions, data layer) — everything else depends on these
4. **Command router and Discord integration gaps** — the request path depends on the framework
5. **Shipped module gaps** — the user-facing surface depends on the router
6. **Testing, CI/CD, infrastructure gaps** — the acceptance gate depends on everything above
7. **Documentation gaps** — last, once the code is correct

---

### 4. REMEDIATION PROTOCOL

For every item in the Gap Manifest, execute this loop:

#### 4.1 The Remediation Loop

**Step 1 — Read the specification.** Read the source-document sections named in §2.2 for the affected subsystem. Read the full specification, not a summary. For known-defect items, also read the corresponding entry in `upgradation/change-log.md`'s defect lifecycle for the documented resolution path. If an ADR in `adr/` governs the affected build choice, read it too — the remediation must land on the recorded decision.

**Step 2 — Diagnose.** Compare the existing code against the specification line by line. Identify exactly what is wrong, missing, or contradictory. Write down the specific delta: "the spec requires X at location Y; the code has Z instead."

**Step 3 — Remediate.** Fix, complete, or build:
- `FAULTY` → fix the behavior to match the specification (do not preserve the faulty behavior for compatibility)
- `PARTIAL` → complete the missing elements per the specification
- `MISSING` → build from the specification
- Duplicate/orphaned subsystem → remove or consolidate to the single canonical path per the one-canonical-path rule

**Step 4 — Write or update the test.** Every remediation must be proven by a test that fails before the fix and passes after. If the subsystem had no tests, write them per the directive's test pyramid. If existing tests encoded the faulty behavior, update them to encode the specified behavior.

**Step 5 — Verify behavior.** Run the test. Run the process if possible. Confirm the subsystem now behaves per specification — not merely compiles.

**Step 6 — Update the Gap Manifest.** Mark the item resolved. If remediation revealed additional gaps in the same or dependent subsystems, add them to the manifest.

**Step 7 — Re-audit dependents.** If the remediated subsystem is a dependency of others (per the severity ordering in §3.4), re-verify the dependent subsystems against their behavioral criteria. A fix in the middleware pipeline, for example, may surface faults in every command that depended on the bypass.

#### 4.2 Remediation Rules

- **Never preserve a fault for compatibility.** If existing code contradicts the specification, the specification wins.
- **Never remove working code to rebuild from scratch unless the existing code is structurally unsalvageable.** Prefer targeted remediation over wholesale rebuild — the goal is 100% compliance, not 100% new code.
- **Never mark an item resolved without a passing test.** A fix without a test is an unverified claim.
- **Every removal of existing code must be justified against the specification.** If the spec requires it, do not remove it; if the spec does not require it and it contradicts the spec, remove it; if the spec is silent, record the judgment call in `upgradation/change-log.md`.
- **When the specification itself has a known open item** (see `upgradation/change-log.md` §5), implement the honest state per the directive's status-honesty rule — do not fake completion.

---

### 5. PHASED BUILD PLAN

Each phase specifies: its goal, source-document sections to read, deliverables, and verification criteria. The verification criteria are the same criteria used in the audit protocol (§3.2) — structural AND behavioral.

**For State A (greenfield):** execute phases in order 0 → 8.

**For State B (existing codebase):** after the audit (§3) and before entering the phases, use the Gap Manifest to determine your entry point. Enter at the phase containing your highest-severity gap, remediate per §4, then proceed through the remaining phases. Phases whose subsystems are all `COMPLETE` in the manifest are skipped — but their verification criteria are still checked in the final enforcement pass (§6).

**For State C (enforcement):** skip the build phases entirely — there is nothing to build and no delta to land. Run the audit (§3) → the remediation protocol (§4) → the Enforcement Pass (§6) against the whole codebase, corpus-wide.

---

#### Phase 0 — Workspace Scaffolding

**Goal:** Correct project skeleton.

**Read:**
- `spec/architecture/directory-file-structure.md` — complete folder tree
- `spec/architecture/directory-file-structure.md` — Directory & File Structure
- `spec/governance/` Part 2 (D-2.1 to D-2.15) — Technology stack and runtime boundaries
- `spec/governance/` (rule D-8.4), D-8.6 — CI sequence, container discipline
- The ADR in `adr/` governing the tier-volume layout and module storage

**Deliver:**
- pnpm workspace with `apps/main/` and `packages/swastik/` as workspace members
- `package.json`, `tsconfig.json` (strict mode per D-2.2), `tsconfig.build.json`
- ESLint flat config including architecture-specific rules (read D-4.4)
- Prettier, Vitest (per-layer coverage thresholds per D-8.2), Husky, commitlint, changesets
- `.env.example`, `.gitignore`
- Docker multi-stage Dockerfile, docker-compose for local dev
- Directory tree per `spec/architecture/directory-file-structure.md` — flat `src/` layout; the `src/core/` legacy wrapper flagged there MUST NOT be created
- No `src/modules` directory — feature modules never live under `src/`. They live on the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging`, rooted at `MODULES_DIR` (default `/mnt/modules`). The volumes exist and are mountable; the framework discovers them by blind discovery at bootstrap, and first-party modules are seeded onto them through the Swastik promotion flow — never committed into the source tree
- `.github/` at the repository root, reserved for the CI workflows delivered in Phase 7 — GitHub Actions cannot read a `.github/` nested under `apps/main/`

**Verify (structural):** `pnpm install` succeeds; `tsc --noEmit` passes; directory structure matches `spec/architecture/directory-file-structure.md`; the four per-tier volumes and `swastik-staging` resolve at `MODULES_DIR` (default `/mnt/modules`); `.github/` exists at the repository root, not under `apps/main/`.
**Verify (behavioral):** The workspace installs and typechecks clean. In State B, this phase is complete if these checks pass — do not re-scaffold over existing structure unless the audit found it unsalvageable.

---

#### Phase 1 — Configuration, Observability & Error Foundation

**Goal:** The process validates config, produces structured output, classifies errors.

**Read:**
- `spec/data/configuration-management.md`, §27, §28 — Configuration, Observability, Error Management
- `spec/governance/` (rule D-2.9), D-2.10, D-7.1, D-7.2, D-3.3

**Deliver:**
- `src/config/` — Root Zod schema, fatal field-level errors
- `src/logging/` — Pino root logger with context scoping and redaction
- `src/metrics/` — Prometheus registry and core metrics
- `src/tracing/` — OpenTelemetry SDK and tracer factory
- `src/errors/` — Root error class and subclasses per the directive's taxonomy

**Verify (structural):** All source files exist and compile.
**Verify (behavioral):** A valid config loads and produces a structured log line with correlation ID, a metric, and a trace span. A broken config exits with a field-level error naming the offending field and its expected format.

---

#### Phase 2 — Bootstrap, DI & Infrastructure

**Goal:** Bootstrap runs to completion against real PostgreSQL and Redis.

**Read:**
- `spec/architecture/application-bootstrap-lifecycle.md`, §9, §10, §24, §25, §26, §29
- `spec/governance/` Part 3 (D-3.1 to D-3.11), Part 5 (D-5.4 to D-5.9), D-7.4

**Deliver:**
- `src/bootstrap/` — Forward-only state machine, full stage sequence per blueprint §8
- `src/di/` — DI container per directive rules (Symbol tokens, lifetimes, frozen core, MockContainer)
- `src/application/` — Application class, shared runtime context
- `src/shutdown/` — Graceful shutdown per blueprint §9 and directive ceilings
- `src/entry/main.ts` — Bot entrypoint
- `src/entry/worker.ts` — Worker entrypoint running the truncated `bootstrapWorker()`: it skips the Discord login and the API/health servers and asserts its runtime role; entrypoints carry main-module guards so nothing auto-starts on import
- `src/db/migrations/core/` — Core table migrations per blueprint §24; every migration has working `down()`
- `src/db/migrations/backfill/` — Proactive backfill (non-fatal; read the change-log for why)
- `src/db/repositories/` — Typed repository base and core repositories
- `src/cache/` — Two-tier cache manager per blueprint §25
- `src/queue/` — BullMQ registry, abstract processor, scheduler
- `src/ratelimit/` — Redis-backed rate limiter with fail-closed fallback (read the change-log for this requirement)
- `src/resilience/` — Circuit breaker, retry policy
- `src/http/` — Fastify server, health/readiness/metrics routes, middleware
- `src/i18n/` — Locale loading, formatters (en-US base locale per directive)
- `src/webhooks/` — Outbound delivery, inbound signature verification per directive

**Verify (structural):** All source files exist and compile. All migration files exist with both `up()` and `down()` exports.
**Verify (behavioral):**
- The process starts and completes every bootstrap stage in the specified order — no stage skipped, no stage re-run
- The worker entrypoint boots through the truncated `bootstrapWorker()` without touching the gateway or the API/health servers, and importing it has no side effects
- `/health/liveness` responds from the health-server stage onward; `/health/readiness` returns 503 during bootstrap and 200 only after the final stage
- A deliberately broken config fails at the config-validation stage with a field-level error — the process does NOT reach the gateway-login stage
- SIGTERM executes the full shutdown sequence within the directive's ceilings; modules unload in reverse load order
- Killing the process mid-run loses no user-visible state (all state is in PostgreSQL/Redis, verified by restart-and-check)
- Redis unavailability degrades (cache miss, queue pause) rather than crashes; the rate limiter fails closed
- Every migration's `down()` actually reverses its `up()` — verified by running up, then down, then up on a test database

---

#### Phase 3 — Module System Framework

**Goal:** The engine that discovers, validates, loads, isolates, and disposes of modules.

**Read:**
- `spec/modules/module-anatomy-manifest.md`, §13, §14, §18, §19, §21
- `spec/governance/` Part 4 (D-4.1 to D-4.14), D-5.1, D-5.2, D-5.3
- The ADRs in `adr/` governing module storage and the sanctioned cross-module patterns

**Deliver:**
- Module registry, loader, and manifest Zod schema (full field set, co-constraints, and the visibility enum per blueprint §11) — framework code under `src/`; feature modules themselves never live in the source tree
- Blind module discovery across the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging`, rooted at `MODULES_DIR` (default `/mnt/modules`) — no hardcoded module lists, no registry seed; tier-at-rest is enforced by the volume a module is loaded from, and first-party modules reach their volumes through the Swastik promotion flow
- `packages/swastik` — the `swastik` module-author import surface: types, manifest schemas, scoped entry points, and the `_template` reference module with the 11-folder canonical layout. Module authors import from this package; importing framework internals is forbidden
- Module lifecycle state machine with hooks per blueprint §13
- The sanctioned inter-module patterns per directive D-4.5 (Global Data Emit included)
- ESLint isolation rules per directive D-4.4
- `src/events/` — Gateway event routing, internal event bus with cycle-depth guard
- `src/permissions/` — Seven-layer resolver, RBAC service, blacklist service, admin-tier gate (defense-in-depth per directive)
- `src/middleware/` — Pipeline framework, all twelve built-in middlewares at canonical priorities per directive D-5.1, constructed on the live dispatch path

**Verify (structural):** All files exist and compile. The manifest Zod schema validates a known-good manifest and rejects a known-bad one (missing tier, invalid tier co-constraint, unresolvable dependency). No `src/modules` directory exists.
**Verify (behavioral):**
- A mock module loads through the registry, its lifecycle hooks fire in order, and its commands register
- Discovery is blind: a module placed on a tier volume is discovered and loaded with no registry edit; a module placed anywhere outside the volumes is not loaded
- A module's tier is enforced by its volume (tier-at-rest) — a module cannot be loaded from a volume whose tier it does not match
- A module whose `onLoad` throws is disabled alone — the process and other modules continue
- The middleware pipeline processes a mock interaction through every one of the twelve built-in middlewares in priority order — verified by a test that observes each stage's effect on the context
- The permission resolver denies by default: a command with no explicit permission declaration is unreachable by any non-owner user
- The event bus rejects or guards synchronous re-entrancy beyond its depth limit
- A cross-module relative import fails the ESLint rule; so does a module author importing framework internals instead of the `swastik` package

---

#### Phase 4 — Discord Integration, Command Router & Renderer

**Goal:** The bot connects to Discord, serves slash commands through the canonical pipeline, and presents every user-facing surface through the core Renderer.

**Read:**
- `spec/architecture/technology-stack-decision-matrix.md`, §10.2, §16.5, §17, §18, §20
- `spec/governance/` (rule D-2.5), D-3.9, D-3.10, D-4.14 and the ban-registry entries governing presentation (embed ban, DM prohibition)
- The ADRs in `adr/` governing the renderer grammar and the accent token

**Deliver:**
- `src/discord/` — Client builder, live + mock gateway adapters
- `src/commands/` — The unified command tree (merged from the former `src/core/commands` split) and the single canonical command router
- `src/interactions/` — Button, select menu, modal, and autocomplete handlers with stateless custom_id and click-time re-authorization
- The core Renderer — the single presentation authority. It issues every user-facing surface as Components v2: the static frame grammar with dynamic slots (accent, banner, module identity, content) and Modes D/M/C per `spec/request-layer/`. Classic `EmbedBuilder`/`MessageEmbed` are banned everywhere in the codebase; renderer-issued Components v2 is the only presentation path
- The buffer-then-render interaction contract: an instant buffer embed on every interaction, edited into the final render or the formal notice frame. Formal notices are the personality's failure voice — honest, never silent — and carry reason codes and a trace correlation ID
- The DM prohibition: the main bot never sends direct messages; every user-facing emission is renderer-issued in channel
- Command registration, Discord upsert, collision detection (fatal), ceiling enforcement per directive D-4.14

**Verify (structural):** All files exist and compile. Exactly one command router exists in the unified `src/commands/` tree — no orphaned or duplicate router anywhere in the codebase, and no remnant of the former `src/core/commands` split.
**Verify (behavioral):**
- The bot connects to a test guild and registers its commands
- Every command invocation demonstrably passes through the full middleware pipeline with all twelve built-in middlewares live — verified by a test that fails if any stage is bypassed
- The permission resolver is invoked on every dispatch — verified by a test that instruments the resolver and confirms invocation on a sample dispatch
- A command-name collision fails registration fatally — verified by registering two commands with the same name and asserting the error
- Component interactions (buttons, selects, modals, autocomplete) re-check authorization at click time — a user who had permission when the message was sent but lost it before clicking is denied
- The embed ban holds: no classic `EmbedBuilder`/`MessageEmbed` construction is reachable anywhere — verified by a lint/grep gate that fails the build on import or instantiation
- Every interaction receives the instant buffer embed and exactly one subsequent edit into the final render or the formal notice frame — verified by asserting the edit sequence, not a second message
- A formal notice carries its reason code and trace correlation ID — verified on a deliberately failed command
- The main bot never DMs — verified on the permission-denied and error paths, where the formal notice frame is issued in channel instead
- The mock gateway adapter enables headless testing of the full dispatch path without a Discord connection

---

#### Phase 5 — Control-Plane Service Stubs

**Goal:** Typed interfaces and entry points for the five control-plane services.

**Read:**
- `spec/modules/swastik-hot-reload-dynamic-module-management.md`, §22, §35
- `spec/governance/` Part 6 (D-6.1 to D-6.6)

**Deliver:**
- `src/entry/power-engine.ts` — Power Engine stub with typed interface
- `src/entry/ssh-clai.ts` — CLAI SSH server entrypoint stub. The console speaks SSH with public-key authentication (ssh2) — no plaintext TCP REPL exists anywhere in the codebase
- `src/entry/swastik.ts` — Swastik stub (manifest reading must NOT use `import()` — read D-4.9)
- `src/entry/credentials.ts` — Credentials Service stub
- Persona (Twill) typed interface — bring-your-own-identity, single-server-bound
- `src/monetization/` — Empty reserved scaffold

**Verify (structural):** Entry points compile; typed interfaces importable.
**Verify (behavioral):** No operational logic executes from any stub. The Swastik stub's manifest-reading path uses static extraction, not dynamic import — verified by inspection and test. The CLAI stub opens no plaintext TCP listener.

---

#### Phase 6 — Shipped Modules

**Goal:** All shipped commands are fully functional modules matching `spec/request-layer/` exactly.

**Read:**
- `spec/request-layer/` — All 9 Divisions, completely. This document owns every visual, layout, interaction, and component detail.
- `spec/modules/module-anatomy-manifest.md`, §12
- `spec/governance/` (rule D-4.2)

**Deliver:**
Build one module per command specified in `spec/request-layer/` — the Core Command Surface: `dashboard`, `health`, `browse`, `queue`, `persona`, `permit`, `modules` (all Core-tier), and `hello-world` (Standard-tier). The complete specifications — commands, modules, tiers, purposes, interaction patterns, Components V2 constants, banner specifications, title formats, emoji rules, button inventories, edit-in-place behavior, dropdown navigation — are all in `spec/request-layer/`. Implement from that document, not from this prompt.

First-party modules are seeded onto their tier volumes (`modules-core` for the Core-tier set, `modules-standard` for `hello-world`) through the Swastik promotion flow — they are not committed into the source tree, and blind discovery picks them up like any other module.

**Verify (structural):** Each module has the 11-folder canonical layout (as templated by the `swastik` package), a valid manifest, and colocated tests.
**Verify (behavioral):**
- Every command responds in a test guild with the exact Components V2 formatting specified in `spec/request-layer/` — container structure, text display content, flag value, banner, title format, attribution line
- Every interaction follows the buffer-then-render contract: the instant buffer embed is edited into the final render or the formal notice frame — verified by asserting the edit, never a second message
- Title and attribution follow the grammar exactly: surface titles carry the module identity; developer attribution appears in the footer/subtitle attribution slot — never in the surface title
- The renderer applies the single official accent token — blurple `#5865F2` — everywhere; no other accent value appears anywhere in the presented surfaces
- Formal notices carry reason codes and a trace correlation ID — the personality's failure voice is honest and never silent
- Dashboard edit-in-place works: the first `/dashboard` sends a message; every subsequent interaction edits it — verified by asserting no second message is sent
- Dropdown navigation works: selecting an option edits the message to the target page; the dropdown remains present on every page
- Permission checks work: commands deny by default and allow with correct roles per the permission engine's resolution
- Module disable/enable works: a disabled module's commands disappear and its handlers stop firing; the rest of the bot continues
- The `hello-world` module passes every item in its testing checklist (`spec/request-layer/` §10.10)
- Every button in `spec/request-layer/`'s button inventory performs its specified action and edits in place

---

#### Phase 7 — Testing, CI/CD & Infrastructure

**Goal:** The build passes its own acceptance gate.

**Read:**
- `spec/lifecycle/testing-architecture-qa.md`, §40, §41, §43
- `spec/governance/` Part 8 (D-8.1 to D-8.9), D-7.6, and the CI-hygiene directives

**Deliver:**
- Unit, integration, happy-path smoke, and E2E tests per the directive's pyramid and per-layer coverage floors
- `.github/` at the repository root — five workflows (the strict fail-fast CI sequence per D-8.4 among them), with CODEOWNERS, templates, and the root `dependabot.yml`. The directory MUST NOT exist under `apps/main/` — GitHub Actions cannot read it there. Actions are SHA-pinned and secrets never travel on command lines (read the directive's CI policy)
- Secret scanning, dependency review, SBOM
- Docker multi-stage build per D-8.6
- K8s manifests per D-8.7 (Kustomize base + overlays, terminationGracePeriodSeconds, probes, HPA, non-root, no automounted token)
- Terraform environment roots
- Operational runbooks per blueprint §43

**Verify (structural):** All files exist; the five workflow definitions are valid and live at the repository root; Docker and K8s manifests parse.
**Verify (behavioral):**
- Full CI sequence is green end-to-end on a real run — verified from the run itself, not the badge
- Per-layer coverage floors are met — verified from the coverage report, not the CI badge
- Docker image builds, runs, and contains only the Application Core (no TypeScript source, no devDependencies in the final image)
- K8s manifests apply to a test cluster and the deployment becomes ready

---

#### Phase 8 — Documentation & Final Verification

**Goal:** The build is documented and passes the Definition of Done (§6).

**Deliver:**
- `README.md`, `adr/`, `docs/runbooks/`, `docs/security/`, `.env.example` (per source documents)
- `adr/` stands as issued: any implementation decision that contradicts a recorded ADR is a deviation to record in `upgradation/change-log.md`, never a silent override
- `upgradation/change-log.md` updated with any deviations per directive D-1.6 and D-0.6
- Final verification per §6

---

### 6. COMPLETION ENFORCEMENT & DEFINITION OF DONE

#### 6.1 The Enforcement Pass

Regardless of starting state (greenfield or existing codebase), the build is NOT complete until the Enforcement Pass succeeds. This is a full re-audit using the §3 protocol — every subsystem, every classification, every behavioral check.

**The Enforcement Pass is the final audit that catches every remaining fault, gap, and bypass.** It is executed after the phased build or remediation is believed complete, and it must produce an all-`COMPLETE` Gap Manifest.

**Enforcement Pass procedure:**

1. **Re-run the full audit** (§3.3, all seven steps) against the finished codebase
2. **Confirm zero `FAULTY`, zero `PARTIAL`, zero `MISSING` items** in the Gap Manifest
3. **Confirm the five Definition of Done conditions** (§6.2 below)
4. **If any item is not `COMPLETE`:** return to the Remediation Protocol (§4), fix, and re-run the Enforcement Pass. Do not declare completion with an unresolved manifest.
5. **Only when the manifest is all-`COMPLETE` and all five conditions are met** is the build finished

**Pacing and resumability (State C).** Verification is exhaustive but paced: process the codebase in the §3.4 severity order, a bounded number of subsystems — and, within a subsystem, files — per session, writing each subsystem's verdict into the Gap Manifest as it is verified. A pass that cannot finish in one session checkpoints and resumes from the manifest; it never skips a file and never declares completion while any subsystem is unverified.

#### 6.2 Definition of Done — Five Conditions

The acceptance gate is specified in `spec/governance/` (rule D-8.11) and the compliance self-audit checklist in `spec/governance/` Appendix B. Read those sections in full and confirm:

1. **Every checkbox in `spec/governance/` (rule D-8.11) is checked** — boot & lifecycle, runtime behavior, data & state, observability & security, delivery & operations.

2. **Every item in `spec/governance/` Appendix B is confirmed** — all load-bearing capabilities.

3. **Every known defect from `upgradation/change-log.md`'s Cross-Version Defect Lifecycle is addressed** — read the defect table, confirm each one's resolution against the built code. None replicated. None papered over.

4. **Every shipped command matches `spec/request-layer/` exactly** — read the interface specification for each command and verify the implementation conforms on every point: formatting, behavior, permissions, interaction patterns, button actions, dropdown navigation, edit-in-place, the buffer-then-render contract, the title and attribution grammar, and the accent token.

5. **Every deviation from the directive is recorded in `upgradation/change-log.md`** per the directive's change-management rule.

#### 6.3 The Completion Standard

When the Enforcement Pass produces an all-`COMPLETE` manifest and all five conditions are met, the result is the product this prompt exists to produce: a bot an operator can deploy once and run indefinitely — scaled, observed, secured, and upgradable without downtime.

**Anything less than all-`COMPLETE` is not done.** A codebase driven through this protocol to an all-`COMPLETE` manifest is finished — regardless of where it started. A codebase that skips the Enforcement Pass is not finished — because the gaps the audit would catch are exactly the ones that matter.

---

*End of Master Build Prompt. Version 5.2.0. Record all future revisions in `upgradation/change-log.md`.*

## 6. Artefacts Produced

| Artefact | Path | When |
|----------|------|------|
| Application | `apps/main/` | per phase |
| Module-authoring SDK | `packages/swastik/` | per phase |
| Gap Manifest | repository root | after the audit (State B) |
| Build and verification records | `upgradation/change-log.md` | per phase and per remediation |

## 7. Acceptance Criteria

The build is complete only when a full re-audit yields an all-`COMPLETE` Gap Manifest **and** the Definition of Done holds (detailed under the enforcement step below): every subsystem `COMPLETE`; every acceptance test passing; every spec-governed ADR honoured; every known gap in `upgradation/change-log.md` addressed honestly; and every core concern implemented exactly once. Anything less than all-`COMPLETE` is not done.

## 8. Change-Log Record

Per the entry discipline in `upgradation/change-log.md` §1.5, this document writes a **Build** line per phase, an **Enforcement** line per verification pass (State C), and a **Verified** line at completion:

```
- <date> · master-prompt 5.2.0 · phase=<n> · state=<A|B|C> · result=<COMPLETE|PARTIAL|BLOCKED>
- <date> · master-prompt 5.2.0 · enforce · subsystem=<name> · verdict=<COMPLETE|FAULTY|PARTIAL|MISSING>
```
