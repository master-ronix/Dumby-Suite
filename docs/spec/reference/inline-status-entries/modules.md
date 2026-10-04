---
id: SPEC-REF-INLINE-STATUS-MODULES
title: Inline Status & Design Entries — modules
kind: spec
status: normative
version: 5.0.0
authority_scope: [reference]
contracts: []
acceptance: [ACC-REF-INLINE-modules]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Inline status & design entries — modules

Status, `Design Consideration`, and `§X Addition` entries the original reference interleaved inline, consolidated here verbatim for this department.

### 11.11 Admin Tier Security Gate — Mechanism and Threat Analysis

The Admin tier security gate is the mechanism that prevents non-owner users from accessing Admin-tier commands. It is the first middleware in the pipeline and runs before permission resolution, rate limiting, and input validation.

The gate operates by checking the invoking user's Discord ID against the owner_ids array in the global configuration. If the user's ID is in the array, the gate passes and the request continues through the middleware pipeline. If the user's ID is not in the array, the gate rejects the request with a "You do not have permission to use this command" message and the handler is never invoked.

The threat analysis for the Admin tier security gate considers several attack vectors. Direct privilege escalation (a non-owner user attempting to invoke an Admin command) is prevented by the gate — the request is rejected before the handler is invoked. Indirect privilege escalation (a non-owner user attempting to access Admin functionality through a Standard or Marketplace module that has a dependency on an Admin module) is prevented by the dependency rules — Standard and Marketplace modules may not declare dependencies on Admin-tier modules. Token theft (an attacker obtaining the bot token and using it to invoke Admin commands directly via the Discord API) is mitigated by the fact that Admin commands are slash commands, not API endpoints — they can only be invoked through Discord's interaction system, which requires the user to be authenticated as the bot owner. Supply chain attacks (a malicious Marketplace module attempting to access Admin functionality) are prevented by the Service Locator's access control — Marketplace modules cannot request Admin-tier services.

### 11.13 Hot Reload Sequence — Detailed Walkthrough

Hot reload allows a module to be unloaded and reloaded at runtime without restarting the bot process. This is essential for development (testing changes without restarting) and for production (applying module updates without downtime).

The hot reload sequence proceeds as follows. First, the Admin or developer initiates a reload request for a specific module (via the /dumby reload command, the Interface Hub, or the CLI). The LifecycleManager receives the request and initiates the unload sequence. The module transitions from ENABLED (or DISABLED) to UNLOADING. The onDisable hook is called (if the module was enabled). The onUnload hook is called. All command handlers are deregistered from the CommandRegistry. All event subscriptions are removed from the EventBus. All background jobs are cancelled in the SchedulerService. All permission registrations are removed from the PermissionService. The module transitions to UNLOADED.

Then, the load sequence begins. The ModuleLoader re-imports the module's code (fetching the latest version from disk). The ModuleValidator re-validates the manifest. The ServiceLocator re-resolves dependencies and re-injects services. The onLoad hook is called. Commands, events, jobs, and permissions are re-registered. The module transitions to ENABLED (or remains DISABLED if it is disabled by configuration).

The one unavoidable boundary is that hot reload cannot change the module's tier. If a module was declared as Standard and the developer changes it to Core, the hot reload will fail with a "tier change not supported" error. The module must be fully unloaded and the bot restarted for a tier change to take effect. This is because the tier affects the module's visibility, controllability, and resource allocation — all of which are evaluated at boot time.

### 11.15 The Module Scaffolding Tool — Complete Reference

The module scaffolding CLI generates a complete module directory structure with all required files. The command takes a module name and tier as arguments. The generated structure includes the module.ts file (implementing the IModule interface with the declared tier), a commands directory with a template command, an events directory, a services directory, a jobs directory, a models directory with a template migration, a permissions.ts file with a template permission, a config.ts file with a Zod schema and defaults, a dashboard.ts file with a template MDIS schema, an i18n directory with an en-US.json template, and a tests directory with happy path, unit, and contract test stubs.

The CLI also updates the pnpm-workspace.yaml file with the new module path. For Marketplace modules, it adds the module to the marketplace catalog JSON file. The CLI validates the module name for kebab-case compliance and checks for collisions with existing modules.

The scaffolding tool is designed to make the "cold start" of a new module as fast as possible. A developer runs one command and gets a compilable, testable module skeleton. The developer's job is to fill in the business logic — the framework infrastructure (lifecycle hooks, dependency injection, command routing, event dispatch, permission resolution, configuration management) is already wired up by the scaffold. Generated code imports only the `swastik` authoring package's scoped entry points (§12.21) — a scaffolded module contains zero framework-internal imports by construction, and compiles against the package's published types.

---

---

### 12.3.1 `pnpm build:module` — Single-Module Compilation

A pnpm script `build:module <name>` is added to `package.json` that compiles a single module's TypeScript to JavaScript without rebuilding the entire Docker image. This supports the hot-reload workflow (kubectl cp + POST /admin/modules/:name/reload).

**Behavior:**
- Accepts a module name argument and resolves `packages/modules/<name>/`.
- Runs a manifest validation pre-build step (rejects if `manifest.ts` is missing or invalid).
- Invokes `tsc` (or `tsup`) with module-level `tsconfig.json` scoped to that directory.
- Emits compiled output to `dist/modules/<name>/`, ready for `kubectl cp` or volume mount.

**

**Dependency:** Redis-backed state.

### 12.20 Module Development Lifecycle — From Concept to Production

This section documents the complete lifecycle of a module from the initial concept through production deployment. It is the guide for a developer who wants to build and publish a module on Dumby's Marketplace.

### §13.6 Addition — Per-Module, Per-Version, Per-Action Audit Trail (source: 'SWASTIK')

Structured audit rows with the documented fields.

### §13.6 Addition — Credentials Service Symmetry (Swastik Delegates Identity Issuance)

Swastik → Credentials Service call for all identity issuance.

### §13.6 Addition — ssh2 Dependency for CLAI

ssh2 npm package installed; `ssh-clai.ts` runs the SSH server with public-key auth against the `clai_operators`/`clai_authkeys` tables.

### §13.6 Addition — Dev Token Hash-Only Storage, Issued Once

Argon2id hash in swastik_developers; raw token shown once.

### 13.8 Core & Admin Tier Performance Baselines

Because Core- and Admin-tier commands bypass the `guild_module_states` cache read

Build ID formatted as `2.3.1+sha256:9f1c…` — semver plus content hash of the build.

entirely, they carry less per-invocation overhead than Standard/Marketplace commands
of equivalent handler complexity — a documented, deliberate performance property, not
an incidental one.

```
TABLE 13-B — Framework Overhead by Tier (excludes handler execution time)

┌─────────────────────┬────────────────┬──────────────┬───────────────────┬─────────┐
│ Tier │ Module-state │ Rate limit │ Permission │ P50 │
│ │ lookup? │ check? │ resolution? │ target │
├─────────────────────┼────────────────┼──────────────┼───────────────────┼─────────┤
│ Admin │ Never │ Never │ Never (owner-gate) │ < 2 ms │
│ Core │ Never │ Yes │ Layers 1–5 & 7 only │ < 5 ms │
│ │ │ │ — RBAC (Layer 6) │ │
│ │ │ │ skipped by design │ │
│ Standard (enabled) │ Yes (L1 hit) │ Yes │ Full 7-layer │ < 8 ms │
│ Standard (disabled) │ Yes (L1 hit) │ Abort first │ Abort first │ < 3 ms │
│ Marketplace (installed)│ Yes (L1 hit) │ Yes │ Full 7-layer │ < 8 ms │
└─────────────────────┴────────────────┴──────────────┴───────────────────┴─────────┘
```

```
TABLE 13-C — End-to-End Targets (full round trip, including handler execution)

┌─────────────────────┬──────────┬──────────┬────────────────┬───────────────────────┐
│ Tier │ P50 │ P99 │ L1 hit ratio │ Availability under │
│ │ end-to-end│ end-to-end│ │ partial outage │
├─────────────────────┼──────────┼──────────┼────────────────┼───────────────────────┤
│ Admin │ < 150 ms │ < 1200 ms │ N/A (bypasses │ Must remain available │
│ │ │ │ guild_module_ │ even if every Standard/ │
│ │ │ │ states entirely) │ Marketplace module has │
│ │ │ │ │ crashed (§11.6 isolation)│
│ Core │ < 80 ms │ < 400 ms │ > 95% │ Must remain available if │
│ │ │ │ │ Redis is down (§26.5 │
│ │ │ │ │ fall-through) │
│ Standard / Marketplace│ < 500 ms │ < 3000 ms │ > 70% │ Best-effort │
└─────────────────────┴──────────┴──────────┴────────────────┴───────────────────────┘
```

**Why Core's availability target specifically excludes a Redis dependency.** If a
basic diagnostic or informational command required Redis reachability, a cache outage
would take down the bot's most basic "is the process still functioning" signal at
exactly the moment an operator needs it most. Core-tier commands are the one place in
the system where falling through to a direct, uncached PostgreSQL read on any cache
error is a hard requirement validated against the exact scenario it exists to survive,
rather than a general resilience nicety applied uniformly everywhere.

### 15.7.1 Command Deregistration — 12–13 Hour Batch Window Gap

Command removal from the Discord registry is currently specified to be batched through `guild_command_queue`, with a 12–13 hour window between queue time and the batch push. This creates a operational gap: a guild administrator who disables a malicious or buggy module must wait up to 13 hours for the corresponding command to be removed from Discord's registry. The specification requires an implemented two-phase approach: (1) an instant deny override using Discord permission overrides that makes the command immediately non-functional for guild members, and (2) the batched deregistration through the queue for the actual Discord API command removal.

### 15.8.1 Sandboxed Validation Execution

All validation performed on an uploaded module — AST traversal, type-checking, linting, and compilation — MUST run inside a lightweight sandbox (a Node `vm` isolate or disposable container) with no network, filesystem, `process.env`, or child-process access. Validation never evaluates untrusted module source by importing it; the manifest is extracted via static AST parsing. Trust in an authenticated, approved developer is not a substitute for this boundary.

### 15.8.2 Module Marketplace Full Flow — Partial

The module marketplace flow is partial. The upload, validation, staging, and promotion pipeline (§15.8) is functional, but the full five-gate review pipeline — including automated security scanning, manual review gate, licensing verification, integration testing, and approval workflow — is not fully implemented. The specification requires a complete five-gate review pipeline where each gate has explicit pass/fail criteria and the pipeline cannot be short-circuited.

### §15.9 Addition — Kubernetes Volume Mount at /mnt/modules

Deployment spec mounts a shared volume (emptyDir or persistent volume) at `/mnt/modules` and sets `MODULES_DIR=/mnt/modules`.

### §15.9 Addition — Health-Check Verification of Module Symlink/Volume Readability

`/health/readiness` verifies the symlink at `/mnt/modules` is readable and contains required modules; on hang, probe fails and K8s removes the pod from the Service without crashing it.

### §15.9 Addition — Gateway Session Resume / Shard Handoff for Zero-Downtime Core Restart

Rolling update with shard handoff / gateway session resume across ≥2 replicas.

### §15.9 Addition — Per-Module Process Isolation (Sandboxed Workers)

Each module runs in own process/container with CPU + memory quota, talking to core over a narrow RPC interface with permission scope and resource limits enforced at the boundary.

## Acceptance
```acceptance
- id: ACC-REF-INLINE-modules
  check: "Every inline status/design entry is preserved verbatim for this department"
  test: tests/docs/inline-status-entries.spec.ts
```