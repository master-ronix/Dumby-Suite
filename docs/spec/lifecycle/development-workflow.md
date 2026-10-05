---
id: SPEC-07-LIFECYCLE-0039
title: 39. Development Workflow
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [DEVELOPMENT_WORKFLOW, LOCAL_ENVIRONMENT_SETUP, BRANCHING_COMMIT_CONVENTION, THE_FEATURE_DEVELOPMENT_CYCLE, DOCKER_BUILD_CONTEXT_IS, DIRECTIVE_MD_NORMATIVE_ENGINEERING, CODE_REVIEW_CHECKLIST, DESIGN_CONSIDERATION_PRIORITIZED_S, DESIGN_CONSIDERATION_MOCKCONTAINER, MANDATORY_WEBHOOK_SIGNATURE_VERIFI, THE_MODULE_SCAFFOLDING_CLI, LOCAL_DEVELOPMENT_ENVIRONMENT]
contracts: []
acceptance: [ACC-LIFE-0039-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 39. Development Workflow

**Status:** [SPEC]

### 39.1 Local Environment Setup

```
$ git clone <repo> && cd dumby
$ pnpm install --frozen-lockfile
$ cp .env.example .env          # fill in a development bot token and dev guild id
$ docker compose -f docker/docker-compose.yml up -d postgres redis
$ pnpm migrate:latest
$ pnpm dev                      # tsx --watch src/entry/main.ts
```

`pnpm dev` runs the identical bootstrap sequence any environment runs, with development hot
reload layered on via `--watch` — there is no separate reduced "local mode" bootstrap path.

### 39.2 Branching & Commit Convention

Branch names carry an intent prefix (`feature/`, `fix/`, `chore/`, `refactor/`), though the
enforced discipline lives in the commit message. `commitlint`, wired through the pre-commit
hooks, rejects any commit not following Conventional Commits (`feat:`, `fix:`, `chore:`,
`refactor:`, `docs:`, `test:`, each optionally scoped). This is what makes changeset-driven
changelog generation automatic.

### 39.3 The Feature Development Cycle

```
DIAGRAM 39-A — The standard cycle

issue / module proposal → branch created, scaffolded if a new module → implementation
following the three-layer rule and the isolation rules → unit tests written alongside
implementation (a PR touching service or command code without test changes is a review
flag) → pnpm lint && pnpm typecheck && pnpm test (identical to CI) → PR opened against
main using the pull-request template → CI pipeline → human review → merge → changesets
release flow
```

**Docker build context is the workspace root.** Docker builds must run with the workspace root
as the build context — building with the application subdirectory as context breaks because the
Dockerfile copy directives reference repo-root paths. The Dockerfile header comment must say so.

### 39.4 The Code Review Checklist

```
TABLE 39-A — Architecture-specific review checklist

1. Tier honesty — does the declared tier actually match how this module is meant to be
   controlled, not just what is convenient to ship?
2. Three-layer rule — no repository logic in a command, no business rule in a repository,
   no event emission below the service layer
3. No cross-module reach beyond the sanctioned patterns — lint catches the import case,
   review catches subtler violations
4. Every migration has a working down
5. The event catalogue is current against every actual emit call
6. New jobs are idempotent — the reviewer checks the pre-condition-check pattern is
   present, not merely that a test exists
7. Coverage floors met per layer, not merely a blended average
```

Two checklist items are candidates for automation: the catalogue-drift check and the
missing-`down` check should become lint or static-analysis gates, and an AST check for the
idempotency pre-condition pattern is feasible. Tier honesty stays manual. A mandatory item is
that every inbound webhook route verifies a cryptographic signature before parsing — a route
accepting unsigned webhooks is a blocking defect.

### 39.5 The Module Scaffolding CLI

`pnpm dumby scaffold --name my-module --tier standard` generates a complete module directory
with all required files: the module entry, a template command, event, service, and job
folders, a template migration, a permissions file, a config schema with defaults, a template
dashboard schema, a locale template, and test stubs. The CLI updates the workspace manifest
with the new module path, adds it to the TypeScript path map, and — for Marketplace modules —
adds a draft catalogue entry. It validates the module name for kebab-case compliance and checks
for collisions.

### 39.6 Local Development Environment

A development run starts the TypeScript compiler in watch mode, the bot process with a
development environment, a local PostgreSQL and Redis (compose), and the control-plane web
server, using a test bot token and test guild. Hot reload is available in development (a module
source change triggers an automatic module reload without restarting the bot) and disabled in
production.

### 39.7 Code Review Process

All changes must be reviewed before merging. The reviewer checks: does the change follow the
module contract (lifecycle hooks, manifest fields, permission declarations)? Cross-module
imports (forbidden)? Direct database or Redis access (forbidden — modules must use typed
service interfaces)? Security vulnerabilities (injection, token leakage)? Performance
degradation (N+1 queries, unbounded loops, memory leaks)? Tests (unit for new functions,
integration for new interactions)? Translations (at least en-US for new user-facing strings)?

### 39.8 Debugging Tools

Admin-tier debug surfaces cover module state, dependencies, resource usage, and recent errors;
event subscribers and delivery stats; the middleware pipeline and permission config for a
command; cache size, hit rate, and eviction stats; and command, event, database, and cache
latency. A live log viewer shows real-time entries with filtering by module, level, and
correlation id.

### 39.9 Developer Documentation

The developer-facing documentation set is the module development guide (contract, lifecycle
hooks, command framework, event system, permission system, config system, testing strategy);
an API reference with the complete type definitions; an examples repository of complete working
modules; and a migration guide covering breaking changes and their mitigations.

### 39.10 How To Verify This Section Against the Code

- The commit hooks and lint-staged config: `apps/main/.husky/`.
- The changeset config: `apps/main/.changeset/config.json`.
- The issue and PR templates: `apps/main/.github/`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0039-1
  check: "The documented dev workflow (branch/commit hooks) is wired and enforced"
  test: tests/ci/hooks.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `Dumby-Suite-main`, `IEvent`, `IJob`, `IPermission`, `index.js`
**files & artifacts:** `Dumby-Suite-main/`, `apps/main/docker/Dockerfile`

