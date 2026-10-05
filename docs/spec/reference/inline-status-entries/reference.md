---
id: SPEC-REF-INLINE-STATUS-REFERENCE
title: Inline Status & Design Entries — reference
kind: spec
status: normative
version: 5.0.0
authority_scope: [reference]
contracts: []
acceptance: [ACC-REF-INLINE-reference]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Inline status & design entries — reference

Status, `Design Consideration`, and `§X Addition` entries the original reference interleaved inline, consolidated here verbatim for this department.

### Fail-Fast / Security-by-Default / Explicit Contracts — the Swastik Alignment Gap

The standing rule is fail-fast validation at startup, security-by-default, and explicit contracts. Swastik is currently misaligned with these principles (trust-based checks, late failures); the target is shift-left, fail-fast, crypto-verified validation across the Swastik pipeline.

Docker Compose (`apps/main/docker-compose.yml`) exposes ports 8080/8081/8082, while the Kubernetes base manifests (`deploy/k8s/base/configmap.yaml`, `deploy/k8s/base/service.yaml`) use 3000/9090/9091. This discrepancy exists because the K8s ConfigMap is production-shaped. Operators must use the documented port mapping when curling health endpoints locally vs. in-cluster. Ports should be env-driven (`PORT`, `HEALTH_PORT`) to avoid hardcoding.

Developer registration via `entry/swastik.ts` must implement a formal licensing gate beyond the `approvalStatus` column. The workflow must include license validation and multi-state approval (pending → license-verified → approved/rejected). The current `approvalStatus` column alone does not constitute a formal approval workflow with licensing verification.

- ** Build from SHA (never branch head), cosign signing, SBOM, provenance, digest pin. The specification requires: ** Build from immutable Git SHA; registry/dumby@sha256; SBOM; cosign; provenance; metadata in PostgreSQL.

- ** Renewable Redis lease + PostgreSQL durable record; fencing tokens; heartbeat; lock/unlock API. The specification requires: ** Redis key release-manager:core-release:lease:{env}, TTL 30s, heartbeat 10s, fencing token; lock/renew/unlock API; queue valid uploads; defer scheduled restart.

- ** Rolling (default maxUnavailable:0,maxSurge:1), blue-green with shard handoff, phased ramp, DAG workload ordering. The specification requires: ** Selectable strategies; DAG order: expand-only migrations→workers→main bot→personas→reconciliation.

- ** Canary: error rate (<2% target, ≥5% critical), P95 (<3000ms, ≥5000ms critical), shard/queue/cache/DB health; min-sample guard; external-dep correlation. The specification requires: ** Prometheus-based canary with differential analysis and external-dep correlation.

- ** Config diff, expand-only migrations, advisory lock, migration ledger. The specification requires: ** Config validation against root schema; additive safety; expand-only migrations; advisory lock; migration ledger in deployment record.

- **Intent:** Zero-downtime core deploys.
- **Purpose:** Never drop capacity during rolling update.
- Deployment/dumby: 2 replicas, rolling update maxSurge 1 / maxUnavailable 0, `terminationGracePeriodSeconds: 190`, runAsNonRoot uid 1000; startup/liveness/readiness probes on health port; HPA 2–10 on CPU 70%/mem 80%; SA `automountServiceAccountToken: false`.
- The system maintains this; pair with gateway session resume.

- **Intent:** Confirm the background job subsystem.
- **Purpose:** Establish queue as delivered Tier-2.
- queue-manager.ts (182L) + autoscaler.ts (86L): Queue/Worker/QueueEvents, removeOnComplete (1hr/1000), removeOnFail:false, 5 attempts exponential backoff, idempotencyKey, pause/resume/retryFailed/deleteJob, DLQ monitor; tests exist.
- Address the single-Redis single point of failure.

### Forward-Only BootstrapProgress State Machine

Bootstrap progress (`stages.ts`) is a forward-only state machine: stages advance monotonically and never regress, mirroring the sequencing discipline of the nine-step shutdown in §9.1. Delivered and correct — maintain the invariant that no stage can be re-entered or skipped backward.

### 90.1 Concept and Planning

The module development lifecycle begins with a concept. The developer identifies a need that is not met by existing modules — perhaps the guild needs a sophisticated poll system with ranked voting, or a ticket system with custom workflows, or a music module with playlist management. The developer evaluates whether the concept is suitable for Dumby by checking the following criteria.

The concept should be a self-contained feature that does not require deep integration with other modules. While modules can communicate through the EventBus and Published Service Contracts, deeply integrated features (that require synchronous access to another module's internal state) are better implemented as part of that other module. The concept should fit within one of the four tiers. If the concept is infrastructure (managing the bot itself), it should be an Admin or Core module — but third-party developers cannot create Admin or Core modules, so the concept must be a feature module (Standard or Marketplace). The concept should not duplicate an existing module's functionality. If an existing module covers 80 percent of the concept, the developer should consider contributing to that module rather than creating a new one. The concept should be implementable within the resource quotas (for Marketplace modules): 5,000ms CPU per minute, 50MB memory, 1,000 cache keys, 100 database queries per minute, 50 HTTP requests per minute, 200 event publications per minute, 10 event subscriptions.

### 90.3 Implementation

The developer implements the module by filling in the generated files. The module.ts file is the main entry point — it implements the IModule interface and exports the module manifest. The developer fills in the manifest fields (name, tier, version, description, dependencies, permissions, configSchema, commands, events, jobs, dashboardSchema, lifecycle hooks).

The commands directory contains the module's command definitions. Each command is defined in its own file. The developer implements the command handler function, which receives the interaction context and executes the command's business logic. The developer also implements the autocomplete handler (if the command has autocomplete-enabled options).

The events directory contains the module's event subscriptions. Each subscription is defined in its own file. The developer implements the event handler function, which receives the event context and processes the event.

The services directory contains the module's internal services — repositories for database access, helpers for business logic, and adapters for external APIs. The developer implements these services as typed classes that receive their dependencies through the service container.

The jobs directory contains the module's background job definitions. Each job is defined in its own file. The developer implements the job handler function, which receives the job data and executes the job's business logic.

The models directory contains the module's database migrations. The developer adds the module's database tables as a Knex migration.

The permissions.ts file defines the module's permissions. The developer declares the permission keys, their human-readable names, their descriptions, and their default levels.

The config.ts file defines the module's configuration schema using Zod. The developer defines the configuration fields, their types, their validation rules, and their default values.

The dashboard.ts file defines the module's MDIS dashboard schema. The developer defines the configuration panel's sections, fields, and actions.

The i18n directory contains the module's translation files. The developer creates at least an en-US.json file with all user-facing strings.

The tests directory contains the module's test files. The developer writes unit tests for command handlers, event handlers, utility functions, and configuration validation. The developer also writes integration tests for database access, event delivery, and the middleware pipeline.

### 90.6 Publishing to the Marketplace

The developer publishes the module to the Marketplace catalog. The publishing process is: the developer creates a marketplace entry in the catalog JSON file with the module's name, version, description, author, homepage, repository, dependencies, permissions, and config schema summary. The developer commits the module to the repository and creates a release tag . The CI pipeline runs the full test suite and builds the module. The Module Gateway verifies the module (contract verification, dependency security scanning, static code analysis, sandboxed execution, resource quota validation). If all checks pass, the module is added to the Marketplace catalog and is available for installation.

### 90.7 Maintenance

After publishing, the developer maintains the module by fixing bugs, adding features, and updating dependencies. Bug fixes are released as patch versions ( → ). New features are released as minor versions ( → ). Breaking changes are released as major versions ( → ) with a migration guide.

The developer monitors the module's performance through the Interface Hub's module management panel, which shows the module's resource usage, error count, and installation count. The developer responds to user feedback through the Marketplace's review system and the support Discord server.

### 90.8 Deprecation

If the developer decides to deprecate the module (stop maintaining it), the following process is followed. The developer marks the module as deprecated in the Marketplace catalog. The Interface Hub displays a deprecation warning for guild owners who have the module installed. The developer provides a migration path (if a replacement module exists) or a data export tool (so guild owners can export their data before the module is removed). After a 90-day deprecation period, the module is removed from the Marketplace catalog. Guild owners who have the module installed can continue using it, but no new installations are allowed. The module's source code remains available in the repository for reference.

---

### Design Consideration — AST-Based Manifest Extraction

Target-state hardening of manifest validation: Swastik parses `manifest.ts` as an AST (TypeScript compiler API / ts-morph), extracts the exported object literal / `defineManifest` argument **without evaluating any JavaScript**, validates the extracted shape against the Zod schema, and resolves class/function identifiers only to confirm existence — never instantiating them. Today Swastik `import`s the manifest directly, which is an RCE vector; AST extraction closes that door while preserving full TypeScript type-safety and keeping the manifest in `.ts` form (it supersedes the rejected JSON-manifest proposal). Honest manifests are unaffected.

### Design Consideration — Source-of-Truth Uploads + Trusted Builder

Swastik should accept TypeScript source only and build the artifact itself in an isolated trusted builder (Docker build container running tsc, ESLint, pnpm). Source-only acceptance plus a trusted build eliminates the current JavaScript bypass of compile-time checks — today pre-built JS is accepted. Impact: Critical; Feasibility: High.

### Design Consideration — Hash-Bound buildId

Every `buildId` should be cryptographically bound to the source archive hash, compiled artifact hash, lockfile hash, gate results, and signature — today it is bound only to the developer identity (`builds` table, promotion check). Promotion must reject any hash mismatch, closing the artifact-substitution attack in which clean source is submitted for review but a different artifact is later uploaded. This protects legitimate builds from tampering.

### Design Consideration — Cryptographic Signing of the Compiled Artifact

Signing should apply to all modules — including first-party ones — and the runtime module loader should verify the signature at load, rather than relying on the devId/buildId pairing alone. This strengthens Gate 5 without changing module behavior.

### Design Consideration — Build Provenance as DB Metadata

The `builds` table should be extended with provenance columns recorded per build (source revision, builder image, gate outcomes, artifact hashes), keeping provenance in the database rather than the manifest and preserving the manifest-vs-database distinction. Today no provenance columns exist.

### Design Consideration — What Gate 5 Signing Actually Signs

The signed-fields list must be documented and enforced identically by the Gate 5 signer and the runtime verifier; today signing exists but the signed fields are unspecified. Pinning the exact field set (module identity, artifact hash, provenance) closes the ambiguity about what a valid signature attests, strengthening integrity without changing module behavior.

### Design Consideration — Disposable Migration Dry-Run + Forbidden-SQL Scan

Migrations currently run live at startup only. The specification requires a Swastik migration validator that dry-runs every migration against a disposable Postgres instance — with a forbidden-SQL scan for destructive statements — before anything touches production. Impact: High; Feasibility: High.

### Design Consideration — Require Source Upload + Server-Side Compilation & Linting

Swastik's upload endpoint requires TypeScript source and performs server-side compilation and linting in its trusted builder context (Gate 1, §15.8), removing the local build step entirely for developers: a developer pushes source, and the build is the platform's job. High impact, high feasibility — it reuses existing CI tooling, and modules are small so builds are cheap.

### Design Consideration — SBOM Generation + Malware/Secret Scanning

The trusted builder should generate an SBOM for every module build and run malware and secret scanning over the source and dependencies, with results attached to the build record. Impact: High; Feasibility: Medium.

### Design Consideration — Sign the Exact Artifact, Not Just the Module Identity

The Gate 5 signature must cover the deployed bytes plus provenance hashes, not just module identity; today the signature scope is unspecified, leaving an identity-only risk where a valid signature could vouch for substituted content. The runtime verifier checks the artifact hash against the signed provenance on every load.

### Design Consideration — Static JavaScript Analysis After Build

The post-build static JS analyzer inside the trusted build rejects forbidden patterns in the compiled output (dynamic `require`, network calls outside sanctioned adapters, filesystem access outside module scope), complementing source-level lint; compliant modules pass automatically.

The target-state build pipeline is a twelve-step trusted builder: source-only intake, lockfile resolution, dependency audit, SBOM generation, compilation, lint, static analysis, tests, artifact hashing, signing, provenance recording, and promotion. This prevents hand-written JavaScript from bypassing compile-time rules and is the engineering backbone of the zero-trust upload model.
**Admin-Tier Environment Guard (Layer 4).** Layer 4 of the admin-tier gate is a manual operator control: a human operator must explicitly set an enable flag **and** ensure `NODE_ENV !== 'production'` before any dangerous Admin-tier capability (such as code evaluation) can execute. Because Admin-tier modules are never publicly reviewed — they exist only in a deployment's own codebase and are reviewed internally via the PR process — the environment guard itself is the structural security gate for deployment.

- Specified — Admin-tier modules are never publicly reviewed; they exist only in the deployment's own codebase; Layer 4 environment guard requires explicit enable flag + `NODE_ENV !== 'production'`.

- Environment guard enforced in code and deployment config; admin capabilities fail-closed outside the enable conditions.

Defense-in-depth firewall: different mechanisms guard different boundaries — the permission resolver, the HTTP server, ESLint rules, and the power-engine dispatcher — so there is no single gate whose failure opens everything.

- Five boundary-specific firewall mechanisms implemented.

- Maintained as the security architecture.

single most consequential surface in the framework to secure correctly, for any
deployment that builds an Admin-tier module at all. Developer identity is split: a
public Dev Account ID (safe to embed in the manifest §10.2 and licensing) is
distinct from the private Dev Token, which is header-only authentication and must
never be shipped inside a module. This resolves the contradiction where the
secret dev ID was simultaneously embedded in the shipped manifest.

### Structural Privilege-Escalation Prevention: The Four Blocked Vectors

Privilege escalation is blocked structurally rather than by convention, across four vectors: (1) runtime intent broadening — the Discord intent union is computed exactly once at login (`apps/main/src/discord/client-builder.ts`), so no runtime code path can widen it; (2) lower-tier to Admin authority — the three-layer rule plus the Admin gate make the jump impossible regardless of input; (3) a guild admin self-granting an elevated role — RBAC resolves fresh from the member's actual Discord roles on every check, so a bot-issued role confers nothing; (4) one module writing another module's tables — a code-review hard stop backed by the repository pattern and ESLint rules in `apps/main/src/permissions/`.

### Signed Build Provenance & Load-Time Verification

Every accepted build carries full provenance in the `builds` table: `sourceArchiveHash`, `artifactHash`, `lockfileHash`, `gateResultsHash`, the machine-readable SBOM, the Ed25519 `signature` with its `signatureKeyId`, and the `signedDescriptor` — the signature computed over the exact promoted artifact bytes bound to the provenance tuple (moduleSlug, version, devId, buildId, sourceHash, artifactHash, gateResultsHash). A build row missing any provenance column is not promotable, and identity-level binding (a devId/buildId pair) never substitutes for the signature.

The runtime loader verifies the Ed25519 signature before every load and every reload — bootstrap, hot-swap, fresh install, and post-revocation re-check — and refuses the load outright on verification failure: the module is neither imported nor executed, the refusal is audited, and the previous version keeps serving. An artifact swapped after signing fails this check because the signature no longer covers the deployed bytes. The **signed Effective Config Descriptor** — module id, build id, resolved config (manifest defaults plus live Power Engine overrides), approval status, approver, timestamp, and revocation flag — is mounted read-only in the module sandbox, and its signature is verified at the same load boundary as the artifact's. `signModule` runs on Gate 5 approval and `revokeModuleSignature` on revocation (§16.4). The Ed25519 signing subsystem itself — key ceremony, custody, and rotation — is deferred greenfield work; until it lands, Swastik's in-process signer holds the keys, and every verification gate specified here is enforced regardless.

### BCCM — Command Collision Resolution

The command router implements BCCM collision resolution so that two modules registering the same command name never silently override each other. Collision detection and resolution (five-step detect → pause → resolve → finalize, with `CommandCeilingService` enforcing the 100-command ceiling) is part of the command registration system (`src/commands/ (the canonical command system)CommandRouter`, spec §15; dep ).

### Multi-Tenancy: Per-Namespace Module Sets via Volume Mounts

The same core image can serve entirely different module sets per namespace or persona: each namespace attaches its own PersistentVolumeClaim and Deployment `volumeMounts`, with `MODULES_DIR` pointing at the mounted path (for example, Pod A mounts a volume of Moderation modules while Pod B mounts an Economy set). Requirements are ReadWriteMany volumes and per-namespace PV/PVC provisioning. Note that `hardcodeGuildId` module fields remain meaningful under this model — they scope runtime guild behavior and are independent of where the module's files live on disk.

### 87.6 InteractionRouter Creates the Interaction Context

The InteractionRouter creates an interaction context object containing: the interaction ID, the interaction token, the application ID, the guild ID, the channel ID, the user ID, the user's permissions, the command name, the command options, the module name, the tier, the permission key, the rate limit configuration, the response format, the service container (the moderation module's injected services), and a response helper (with methods: reply, defer, editReply, followUp, ephemeral).

### 87.15 Post-Processing

After the response is sent, the following post-processing occurs. The dumby_command_duration_seconds histogram is updated with the total duration (from interaction receipt to response submission). The dumby_commands_total counter is incremented with labels: command ("ban"), module ("moderation"), status. The interaction context is discarded (it is not cached — interaction contexts are single-use). The audit log entry is visible in the Interface Hub's audit log panel. The command appears in the user's interaction history (if analytics is enabled).

### 88.2 GatewayClient Receives the Event

The GatewayClient receives the WebSocket frame. It decompresses the zlib payload. It parses the JSON payload. It extracts the opcode (0 — DISPATCH), the sequence number, the event name (GUILD_MEMBER_ADD), and the event data. It updates the internal sequence number counter. It passes the event name and data to the EventDispatcher.

### devId Sensitivity — the Bot-Token Analogy

The devId/Dev Token is handled with exactly the sensitivity of a Discord bot token; it is the project's canonical reference for bearer-secret handling (Argon2id hashing, once-only issuance, Authorization-header transport). That bar is precisely what makes any embedding of the devId inside a shipped manifest a critical fault.

### Entry Point Separation

Seven entry points (`src/entry/main.ts`, `pep.ts`, `ssh-clai.ts`, and the rest) each boot the same DI container but start different service subsets. Maintain the separation, and document each entry point's purpose and service subset in the runbook.

Three capabilities in this architecture sit outside the module system entirely rather

# PART V — DATA & STATE

---

### Design Consideration — Docker vs K8s Port & Adapter Default Reconciliation

The Docker Compose file, Kubernetes configmap, and `.env.example` should agree on port numbers and adapter defaults, so an operator moving between local and cluster contexts is not silently misconfigured by a stale default.

### Design Consideration — In-Cluster Postgres/Redis Dev Overlay

To make `kubectl apply` self-sufficient for local development, `deploy/k8s/overlays/dev/` should gain an in-cluster PostgreSQL and Redis (dev-only, non-production grade) so a single overlay brings up the complete stack without external service dependencies. Impact: Medium; Feasibility: High.

### Design Consideration — DB Pool-Sizing Formula in Terraform

The reference Terraform module should set `max_connections = (max_pods × pool_max × 1.2) + 20`, paired with a startup assertion that refuses to boot when the configured `DATABASE_POOL_MAX` would exceed the server's provisioned capacity. Codifying the formula prevents connection-flood incidents instead of diagnosing them after the fact. Impact: High; Feasibility: High.

Decouple modules from the base image by mounting a per-module PVC at `/app/dist/modules/<name>` (or `/mnt/modules`), treating modules as plugins rather than image content. Staging already ships the `swastik-staging` PVC and the per-tier live volumes (all nested under `MODULES_DIR`); extending this per module makes single-module updates an image-free operation.
Release Manager renews the Redis core-release lease every 10s with a 30s TTL; crash causes lease expiry and Swastik resumes after bounded TTL.

The lease heartbeat renews every 10 s with a 30 s TTL, exactly as specified in §15.4.

Monotonic fencing token prevents stale instructions during core release.

Monotonic fencing tokens prevent stale instructions during a core release, exactly as specified in §15.4.

Ensure correct deployment sequence for workers, bots, and personas.

Deployment follows the DAG order: (1) expand-only migrations, (2) worker workloads, (3) main bot workloads, (4) persona workloads, (5) post-rollout reconciliation.

### Design Consideration — Rollback Completion Criteria

Auto-rollback is specified, but its completion criteria are not. The specification requires explicit completion criteria enforced by Swastik's rollback logic (active symlink read-back, audit events per step) plus alerting when a rollback fails or stalls. This makes an existing safety mechanism reliable enough to depend on.

### Design Consideration — Heap-Diff Watcher

A proposed three-layer memory-leak detection architecture: (1) a Heap Diff Watcher that snapshots and diffs heap profiles between intervals; (2) a Managed Resource Registry for framework-enforced cleanup; (3) a graceful memory-pressure valve. Implemented together as core framework features, leak protection becomes a default property of the runtime rather than an operator's postmortem chore. Impact: High; Feasibility: Medium.

### directive.md — Normative Engineering Rules (MUST/SHOULD/MAY)

`directive.md` is the imperative rule set translating the architecture into actionable gates: structured MUST/SHOULD/MAY requirements (RFC 2119) for the Application Core and control-plane services, in eight parts, explicitly excluding frontend and module-authoring guidance. It is non-enforcing but authoritative — enforcement is via tooling (ESLint rules, `tsc` gates), not the document itself — and it stays derived from and subordinate to blueprint.md.

### Design Consideration — Prioritized Subsystem Test Plan

Test coverage should be written in priority order using the existing DI infrastructure (`di/mock-container.ts`, the 11 ports exposed by `core/commands/ports.ts`): bootstrap, cache, db, queue, events, http, permissions, modules, middleware, shutdown. No tests exist today for 25+ subsystems despite the infrastructure being available; rated the single highest-impact action for code confidence.

### 44.1.1 Kind-Based End-to-End K8s Script

`scripts/kind-dev-up.sh` provisions a local Kubernetes cluster end-to-end to reduce friction for local testing of Dumby.

**Steps performed by the script:**
1. Create a Kind cluster (or reuse an existing one).
2. Build the Docker image and load it into the Kind node (`kind load docker-image`).
3. Create the `dumby-secrets` Secret from local env/values.
4. Apply kustomize overlays under `deploy/k8s/overlays/staging/`.

**.

## Acceptance
```acceptance
- id: ACC-REF-INLINE-reference
  check: "Every inline status/design entry is preserved verbatim for this department"
  test: tests/docs/inline-status-entries.spec.ts
```