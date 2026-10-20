---
id: BLUEPRINT-STRUCTURE
title: Structure & Topology
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:structure]
note: transcribed from the real repository tree at branch feature/dev
---

# DUMBY-SUITE — Complete File Directory Structure

**Transcribed from the real repository** — `master-ronix/Dumby-Suite`, branch `feature/dev`
({{counts.tree_entries}} entries: {{counts.tree_dirs}} directories, {{counts.tree_files}} files). Directories and key files, annotated (`←`) with
each folder's role. This is the **physical tree as it is**, not an intended layout: where an
earlier draft showed a `src/core/` wrapper or a `container/` / `modules/` naming, the real
tree is flat `src/` with `di/` and `module-system/`.

Feature modules do not live in this repository: they reside on external per-tier Kubernetes
volumes (runtime-topology block below).

```text
dumby-suite/
├── .github/   ← root CI (workflows/ci.yml · dependabot.yml)
│   ├── workflows/
│   │   └── ci.yml
│   └── dependabot.yml
├── apps/   ← deployable applications (workspace members)
│   └── main/   ← THE DUMBY BOT APPLICATION — the primary deployable
│       ├── .changeset/
│       │   └── config.json
│       ├── .github/   ← app-level CI/CD (ci · release · deploy-staging · deploy-production · dependency-review)
│       │   ├── ISSUE_TEMPLATE/
│       │   │   ├── bug_report.yml
│       │   │   ├── feature_request.yml
│       │   │   └── module_proposal.yml
│       │   ├── workflows/
│       │   │   ├── ci.yml
│       │   │   ├── dependency-review.yml
│       │   │   ├── deploy-production.yml
│       │   │   ├── deploy-staging.yml
│       │   │   └── release.yml
│       │   ├── CODEOWNERS
│       │   └── PULL_REQUEST_TEMPLATE.md
│       ├── .husky/
│       │   ├── commit-msg
│       │   └── pre-commit
│       ├── .vscode/
│       │   ├── snippets/
│       │   │   └── dumby.code-snippets
│       │   ├── extensions.json
│       │   ├── launch.json
│       │   └── settings.json
│       ├── deploy/   ← k8s (base + overlays) · terraform
│       │   ├── k8s/
│       │   │   ├── base/
│       │   │   │   ├── configmap.yaml
│       │   │   │   ├── deployment.yaml
│       │   │   │   ├── hpa.yaml
│       │   │   │   ├── kustomization.yaml
│       │   │   │   ├── service.yaml
│       │   │   │   ├── serviceaccount.yaml
│       │   │   │   └── swastik-volumes.yaml
│       │   │   └── overlays/
│       │   │       ├── production/
│       │   │       │   ├── configmap-patch.yaml
│       │   │       │   └── kustomization.yaml
│       │   │       └── staging/
│       │   │           ├── configmap-patch.yaml
│       │   │           ├── kustomization.yaml
│       │   │           └── replicas-patch.yaml
│       │   └── terraform/
│       │       ├── environments/
│       │       │   ├── production/
│       │       │   │   └── README.md
│       │       │   └── staging/
│       │       │       └── README.md
│       │       └── modules/
│       │           ├── database/
│       │           │   └── main.tf
│       │           ├── kubernetes/
│       │           │   └── main.tf
│       │           └── redis/
│       │               └── main.tf
│       ├── docker/   ← Dockerfile · Dockerfile.dev · docker-compose
│       │   ├── Dockerfile
│       │   ├── Dockerfile.dev
│       │   └── docker-compose.yml
│       ├── docs/   ← adr · api · architecture · compliance · runbooks
│       │   ├── adr/
│       │   │   ├── 001-clai-ssh-public-key-only.md
│       │   │   ├── 002-flattened-directory-layout.md
│       │   │   ├── 003-deploy-dir-naming.md
│       │   │   ├── 004-three-tier-scope.md
│       │   │   └── 005-open-items.md
│       │   ├── api/
│       │   │   └── README.md
│       │   ├── architecture/
│       │   │   └── README.md
│       │   ├── compliance/
│       │   │   └── README.md
│       │   ├── privacy/
│       │   │   └── README.md
│       │   ├── runbooks/
│       │   │   └── README.md
│       │   └── security/
│       │       └── README.md
│       ├── scripts/   ← migrate · seed · build/push modules · smoke · verify
│       │   ├── build-modules.ts
│       │   ├── chaos-test.ts
│       │   ├── check-generated-syntax.ts
│       │   ├── e2e-test.ts
│       │   ├── load-test.ts
│       │   ├── migrate.ts
│       │   ├── push-modules.ts
│       │   ├── seed.ts
│       │   ├── smoke-test.ts
│       │   ├── swastik-deploy.ts
│       │   ├── verify-all.ts
│       │   ├── verify-deploy.mjs
│       │   ├── verify-env.ts
│       │   └── verify-local.ts
│       ├── src/   ← ═══ THE APPLICATION SOURCE — 33 flat directories (no src/core wrapper) ═══
│       │   ├── analytics/   ← MTP token calculator
│       │   │   └── mtp-token-calculator.ts
│       │   ├── application/   ← bootstrap orchestrator (18 stages) · ApplicationContext · health server
│       │   │   ├── Application.ts
│       │   │   ├── ApplicationContext.ts
│       │   │   └── HealthServer.ts
│       │   ├── bootstrap/   ← bootstrap.ts · stages.ts (forward-only progress state machine)
│       │   │   ├── bootstrap.ts
│       │   │   └── stages.ts
│       │   ├── cache/   ← two-tier cache (L1 LRU + Redis L2) · stampede guard · key namespace · Redis lock store
│       │   │   ├── cache-manager.ts
│       │   │   ├── key-namespace.ts
│       │   │   ├── l1-cache.ts
│       │   │   ├── redis-lock-store.ts
│       │   │   └── stampede-guard.ts
│       │   ├── commands/   ← registry · router · deployer · collision resolution · ceiling
│       │   │   ├── collision-resolution.ts
│       │   │   ├── command-ceiling.ts
│       │   │   ├── command-deployer.ts
│       │   │   ├── command-registry.ts
│       │   │   ├── command-router.ts
│       │   │   └── module-command.ts
│       │   ├── config/   ← env schema · config service · guild-config service
│       │   │   ├── config.service.ts
│       │   │   ├── env.schema.ts
│       │   │   └── guild-config.service.ts
│       │   ├── credentials/   ← developer credentials · sealed credentials · bearer
│       │   │   ├── credential-client.ts
│       │   │   ├── credential-refusal.ts
│       │   │   ├── developer-bearer.ts
│       │   │   ├── developer-credential.service.ts
│       │   │   └── sealed-credential.service.ts
│       │   ├── crypto/   ← envelope encryption
│       │   │   ├── envelope-scope.ts
│       │   │   └── envelope.ts
│       │   ├── db/   ← Knex client · knexfile · replica router · migrations/ (44) · repositories/
│       │   │   ├── migrations/
│       │   │   │   ├── 20260101000001_create_guilds.ts
│       │   │   │   ├── 20260101000002_create_users.ts
│       │   │   │   ├── 20260101000003_create_guild_members.ts
│       │   │   │   ├── 20260101000004_create_guild_configs.ts
│       │   │   │   ├── 20260101000005_create_guild_roles.ts
│       │   │   │   ├── 20260101000006_create_guild_module_states.ts
│       │   │   │   ├── 20260101000007_create_marketplace_listings.ts
│       │   │   │   ├── 20260101000008_create_audit_logs.ts
│       │   │   │   ├── 20260101000009_create_blocked_users.ts
│       │   │   │   ├── 20260101000010_create_metering_usage_daily.ts
│       │   │   │   ├── 20260101000011_create_guild_outbound_webhooks.ts
│       │   │   │   ├── 20260101000012_create_webhook_deliveries_idempotency.ts
│       │   │   │   ├── 20260101000013_create_backup_history.ts
│       │   │   │   ├── 20260101000014_create_rbac_sets.ts
│       │   │   │   ├── 20260101000015_create_rbac_groups.ts
│       │   │   │   ├── 20260101000016_create_rbac_group_role_bindings.ts
│       │   │   │   ├── 20260101000017_create_rbac_grants.ts
│       │   │   │   ├── 20260101000018_create_guild_command_queue.ts
│       │   │   │   ├── 20260101000019_create_guild_command_overrides.ts
│       │   │   │   ├── 20260101000020_create_persona_identities.ts
│       │   │   │   ├── 20260101000021_create_guild_persona_bindings.ts
│       │   │   │   ├── 20260101000022_create_system_state.ts
│       │   │   │   ├── 20260101000023_create_mtp_token_ledger_daily.ts
│       │   │   │   ├── 20260101000024_create_clai_authkeys.ts
│       │   │   │   ├── 20260101000025_create_swastik_developers.ts
│       │   │   │   ├── 20260101000026_create_swastik_builds.ts
│       │   │   │   ├── 20260101000027_create_module_selftest_entries.ts
│       │   │   │   ├── 20260101000028_create_signing_keys.ts
│       │   │   │   ├── 20260101000029_create_api_sessions.ts
│       │   │   │   ├── 20260101000030_create_otp_secrets.ts
│       │   │   │   ├── 20260101000031_create_clai_operators.ts
│       │   │   │   ├── 20260101000032_align_swastik_control_tables.ts
│       │   │   │   ├── 20260101000033_create_release_governance_tables.ts
│       │   │   │   ├── 20260101000034_align_persona_model.ts
│       │   │   │   ├── 20260101000035_create_sealed_credentials.ts
│       │   │   │   ├── 20260101000036_align_guild_command_overrides.ts
│       │   │   │   ├── 20260101000037_create_credentials.ts
│       │   │   │   ├── 20260101000038_add_developer_credential_key_id.ts
│       │   │   │   ├── 20260101000039_add_build_provenance.ts
│       │   │   │   ├── 20260101000040_create_module_ownership.ts
│       │   │   │   ├── 20260101000041_create_approvals.ts
│       │   │   │   ├── 20260101000042_add_persona_sealed_token.ts
│       │   │   │   ├── 20260101000043_create_guild_suspensions.ts
│       │   │   │   └── 20260101000044_audit_outcome_failed.ts
│       │   │   ├── repositories/
│       │   │   │   ├── approval.repository.ts
│       │   │   │   ├── base.repository.ts
│       │   │   │   ├── build.repository.ts
│       │   │   │   ├── credential.repository.ts
│       │   │   │   ├── deployment-record.repository.ts
│       │   │   │   ├── module-ownership.repository.ts
│       │   │   │   ├── rbac-grant.repository.ts
│       │   │   │   └── sealed-credential.repository.ts
│       │   │   ├── client.ts
│       │   │   ├── knexfile.ts
│       │   │   ├── migration-helpers.ts
│       │   │   └── replica-router.ts
│       │   ├── di/   ← DI container · symbol-token registry · mock container
│       │   │   ├── container.ts
│       │   │   ├── mock-container.ts
│       │   │   └── tokens.ts
│       │   ├── discord/   ← client builder · live + mock gateway adapters · shard ownership
│       │   │   ├── client-builder.ts
│       │   │   ├── gateway.live-adapter.ts
│       │   │   ├── gateway.mock-adapter.ts
│       │   │   └── shard-ownership.ts
│       │   ├── entry/   ← process entrypoints (main · worker · migrate · power-engine · ssh-clai · swastik · credentials · twill) + guards
│       │   │   ├── clai-session-limits.ts
│       │   │   ├── credentials.ts
│       │   │   ├── is-main-entry.ts
│       │   │   ├── main.ts
│       │   │   ├── migrate.ts
│       │   │   ├── power-engine.ts
│       │   │   ├── ssh-clai.ts
│       │   │   ├── swastik.ts
│       │   │   ├── twill.ts
│       │   │   └── worker.ts
│       │   ├── errors/   ← error taxonomy (DumbyError + subclasses)
│       │   │   └── taxonomy.ts
│       │   ├── events/   ← gateway event router · internal event bus · event-loop-lag guard
│       │   │   ├── event-bus.ts
│       │   │   ├── event-loop-lag.ts
│       │   │   └── event-router.ts
│       │   ├── governance/   ← approvals · guild suspensions
│       │   │   ├── approval.ts
│       │   │   └── guild-suspension.ts
│       │   ├── http/   ← Fastify server · routes (health/metrics/info/admin/oauth) · error boundary · internal auth · Power Engine dispatcher
│       │   │   ├── oauth/
│       │   │   │   └── oauth2-client.ts
│       │   │   ├── routes/
│       │   │   │   ├── admin.routes.ts
│       │   │   │   ├── health.routes.ts
│       │   │   │   ├── info.routes.ts
│       │   │   │   ├── metrics.routes.ts
│       │   │   │   └── oauth.routes.ts
│       │   │   ├── client.ts
│       │   │   ├── error-boundary.ts
│       │   │   ├── internal-auth.ts
│       │   │   ├── power-engine-catalog.ts
│       │   │   ├── power-engine-dispatcher.ts
│       │   │   └── server.ts
│       │   ├── i18n/   ← i18n manager · formatters
│       │   │   ├── formatters.ts
│       │   │   └── i18n-manager.ts
│       │   ├── interactions/   ← interaction registry (custom_id minting)
│       │   │   └── interaction-registry.ts
│       │   ├── licensing/   ← licence state machine · store · semver · compatibility ledger · deployment records
│       │   │   ├── compatibility-ledger.ts
│       │   │   ├── deployment-records.ts
│       │   │   ├── license-machine.ts
│       │   │   ├── license-store.ts
│       │   │   └── semver.ts
│       │   ├── logging/   ← Pino root logger
│       │   │   └── logger.ts
│       │   ├── metrics/   ← Prometheus registry
│       │   │   └── registry.ts
│       │   ├── middleware/   ← onion pipeline · built-in/ (12 stages)
│       │   │   ├── built-in/
│       │   │   │   ├── admin-tier-gate.ts
│       │   │   │   ├── analytics.ts
│       │   │   │   ├── auth.ts
│       │   │   │   ├── cooldown.ts
│       │   │   │   ├── defer.ts
│       │   │   │   ├── guild-config.ts
│       │   │   │   ├── locale.ts
│       │   │   │   ├── maintenance-mode.ts
│       │   │   │   ├── permission.ts
│       │   │   │   ├── rate-limit.ts
│       │   │   │   ├── rbac.ts
│       │   │   │   └── trace.ts
│       │   │   ├── base-middleware.ts
│       │   │   └── middleware-pipeline.ts
│       │   ├── module-system/   ← module registry · loader · manifest schema · tier rules · topo-sort · promotion · Swastik loader · build signing
│       │   │   ├── build-signing.ts
│       │   │   ├── loader.ts
│       │   │   ├── manifest.schema.ts
│       │   │   ├── module-ownership.ts
│       │   │   ├── promotion.ts
│       │   │   ├── registry.ts
│       │   │   ├── swastik-loader.ts
│       │   │   ├── tier-rules.ts
│       │   │   └── topo-sort.ts
│       │   ├── monetization/   ← reserved scaffold (README only — intentionally empty)
│       │   │   └── README.md
│       │   ├── permissions/   ← 7-layer resolver · rank · RBAC · grant surface · blacklist · admin gates
│       │   │   ├── admin-eval-gate.ts
│       │   │   ├── admin-tier-gate.ts
│       │   │   ├── db-blacklist.ts
│       │   │   ├── grant-surface.ts
│       │   │   ├── rank.ts
│       │   │   ├── rbac.ts
│       │   │   └── resolver.ts
│       │   ├── personas/   ← persona · repository · command-binding service
│       │   │   ├── persona-command-binding.service.ts
│       │   │   ├── persona.repository.ts
│       │   │   └── persona.ts
│       │   ├── queue/   ← BullMQ queue manager · processor base · scheduler · autoscaler
│       │   │   ├── autoscaler.ts
│       │   │   ├── base-processor.ts
│       │   │   ├── queue-manager.ts
│       │   │   └── scheduler.ts
│       │   ├── ratelimit/   ← Redis sliding-window rate limiter
│       │   │   └── sliding-window.ts
│       │   ├── rendering/   ← core-renderer.ts — the single presentation authority
│       │   │   └── core-renderer.ts
│       │   ├── resilience/   ← circuit breaker · retry policy
│       │   │   ├── circuit-breaker.ts
│       │   │   └── retry-policy.ts
│       │   ├── shared/   ← constants · types · utils · testing (MockContainer) · erasure coordinator
│       │   │   ├── constants/
│       │   │   │   ├── colors.ts
│       │   │   │   ├── durations.ts
│       │   │   │   ├── index.ts
│       │   │   │   └── limits.ts
│       │   │   ├── testing/
│       │   │   │   └── index.ts
│       │   │   ├── types/
│       │   │   │   └── index.ts
│       │   │   ├── utils/
│       │   │   │   ├── components-v2.ts
│       │   │   │   ├── crypto.ts
│       │   │   │   ├── index.ts
│       │   │   │   ├── paginator.ts
│       │   │   │   ├── path-guard.ts
│       │   │   │   ├── retry.ts
│       │   │   │   └── snowflake.ts
│       │   │   └── erasure-coordinator.ts
│       │   ├── shutdown/   ← graceful shutdown · fatal handler · in-flight tracker
│       │   │   ├── fatal-handler.ts
│       │   │   ├── in-flight-tracker.ts
│       │   │   └── shutdown.ts
│       │   └── tracing/   ← OpenTelemetry
│       │       └── tracing.ts
│       ├── tests/   ← unit + integration tests
│       │   ├── integration/
│       │   │   └── http/
│       │   │       └── health.integration.test.ts
│       │   └── unit/
│       │       ├── helpers/
│       │       │   └── command-harness.ts
│       │       ├── admin-routes.test.ts
│       │       ├── application-class.test.ts
│       │       ├── application.test.ts
│       │       ├── bootstrap-stages.test.ts
│       │       ├── cache-key-namespace.test.ts
│       │       ├── cache-manager.test.ts
│       │       ├── circuit-breaker.test.ts
│       │       ├── client-builder.test.ts
│       │       ├── collision-resolution.test.ts
│       │       ├── command-ceiling.test.ts
│       │       ├── command-deployer.test.ts
│       │       ├── command-registry-router.test.ts
│       │       ├── command-registry.test.ts
│       │       ├── command-tree-structure.test.ts
│       │       ├── compatibility-ledger.test.ts
│       │       ├── components-v2.test.ts
│       │       ├── config-service.test.ts
│       │       ├── core-renderer.test.ts
│       │       ├── db-blacklist.test.ts
│       │       ├── deployment-records.test.ts
│       │       ├── di-container.test.ts
│       │       ├── env-schema.test.ts
│       │       ├── erasure-coordinator.test.ts
│       │       ├── error-boundary.test.ts
│       │       ├── errors.test.ts
│       │       ├── event-bus.test.ts
│       │       ├── event-loop-lag.test.ts
│       │       ├── event-router.test.ts
│       │       ├── first-party-module-seed.test.ts
│       │       ├── gateway-live-adapter.test.ts
│       │       ├── gateway-mock-adapter.test.ts
│       │       ├── grant-surface.test.ts
│       │       ├── guild-config-service.test.ts
│       │       ├── http-routes.test.ts
│       │       ├── i18n.test.ts
│       │       ├── in-flight-tracker.test.ts
│       │       ├── interaction-registry.test.ts
│       │       ├── l1-cache.test.ts
│       │       ├── license-machine.test.ts
│       │       ├── logger.test.ts
│       │       ├── m0-bind-hosts.test.ts
│       │       ├── m0-build-provenance.test.ts
│       │       ├── m0-clai-limits.test.ts
│       │       ├── m0-developer-credentials.test.ts
│       │       ├── m0-module-ownership.test.ts
│       │       ├── m0-owner-approval.test.ts
│       │       ├── m0-security.test.ts
│       │       ├── m10-terminology-sweep.test.ts
│       │       ├── m3-embed-and-dm.test.ts
│       │       ├── m3-http-client-retry.test.ts
│       │       ├── m3-prefix-ban-layers.test.ts
│       │       ├── m3-schema-authoring.test.ts
│       │       ├── m4-grant-writer-wiring.test.ts
│       │       ├── m4-grant-writer.test.ts
│       │       ├── m5-deployment-records.test.ts
│       │       ├── m6-loader-guard-wiring.test.ts
│       │       ├── m6-promotion.test.ts
│       │       ├── m7-persona-sealed-token.test.ts
│       │       ├── m7-persona.test.ts
│       │       ├── m8-envelope.test.ts
│       │       ├── m8-scope-verification.test.ts
│       │       ├── m9-admin-eval-gate.test.ts
│       │       ├── m9-ci-hygiene.test.ts
│       │       ├── m9-control-plane.test.ts
│       │       ├── m9-defer-stage.test.ts
│       │       ├── m9-entrypoint.test.ts
│       │       ├── m9-env-hygiene.test.ts
│       │       ├── m9-event-loop-shedding.test.ts
│       │       ├── m9-fatal-handler.test.ts
│       │       ├── m9-gateway-event-routing.test.ts
│       │       ├── m9-hmac-rfc4231.test.ts
│       │       ├── m9-info-routes.test.ts
│       │       ├── m9-job-queue-registration.test.ts
│       │       ├── m9-logger-redaction.test.ts
│       │       ├── m9-main-entry-guards.test.ts
│       │       ├── m9-middleware-wiring.test.ts
│       │       ├── m9-module-lint-gate.test.ts
│       │       ├── m9-mtp-token-calculator.test.ts
│       │       ├── m9-oauth2-flow.test.ts
│       │       ├── m9-promotion-lock.test.ts
│       │       ├── m9-quarantine-path.test.ts
│       │       ├── m9-queue-pause-routing.test.ts
│       │       ├── m9-read-replica-routing.test.ts
│       │       ├── m9-revoke-suspend.test.ts
│       │       ├── m9-scheduler-wiring.test.ts
│       │       ├── m9-shard-ownership.test.ts
│       │       ├── m9-tracing-wiring.test.ts
│       │       ├── manifest-schema.test.ts
│       │       ├── metrics.test.ts
│       │       ├── middleware.test.ts
│       │       ├── mock-container.test.ts
│       │       ├── module-loader.test.ts
│       │       ├── mr1-hello-world.test.ts
│       │       ├── mr2-8-core-modules.test.ts
│       │       ├── permission-resolver.test.ts
│       │       ├── power-engine-dispatcher.test.ts
│       │       ├── power-engine-suspend-guild-flow.test.ts
│       │       ├── queue-autoscaler.test.ts
│       │       ├── queue-manager.test.ts
│       │       ├── queue-scheduler.test.ts
│       │       ├── rank.test.ts
│       │       ├── rbac.test.ts
│       │       ├── release-manager-gate.test.ts
│       │       ├── retry-policy.test.ts
│       │       ├── shared-utils-extra.test.ts
│       │       ├── shared-utils.test.ts
│       │       ├── shutdown.test.ts
│       │       ├── sliding-window-rate-limiter.test.ts
│       │       ├── stampede-guard.test.ts
│       │       ├── tier-rules.test.ts
│       │       ├── topo-sort.test.ts
│       │       └── tracing.test.ts
│       ├── .dockerignore
│       ├── .env.example
│       ├── .gitignore
│       ├── .nvmrc
│       ├── .prettierignore
│       ├── .prettierrc.json
│       ├── Dockerfile
│       ├── README.md
│       ├── docker-compose.yml
│       ├── eslint.config.mjs
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.tests.json
│       ├── vitest.config.ts
│       └── vitest.integration.config.ts
├── artifacts/   ← Replit scaffold — NOT the bot (api-server · mockup-sandbox)
│   ├── api-server/
│   │   ├── .replit-artifact/
│   │   │   └── artifact.toml
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── .gitkeep
│   │   │   │   └── logger.ts
│   │   │   ├── middlewares/
│   │   │   │   └── .gitkeep
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   └── index.ts
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   ├── build.mjs
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mockup-sandbox/
│       ├── .replit-artifact/
│       │   └── artifact.toml
│       ├── src/
│       │   ├── .generated/
│       │   │   └── mockup-components.ts
│       │   ├── components/
│       │   │   └── ui/
│       │   │       ├── accordion.tsx
│       │   │       ├── alert-dialog.tsx
│       │   │       ├── alert.tsx
│       │   │       ├── aspect-ratio.tsx
│       │   │       ├── avatar.tsx
│       │   │       ├── badge.tsx
│       │   │       ├── breadcrumb.tsx
│       │   │       ├── button-group.tsx
│       │   │       ├── button.tsx
│       │   │       ├── calendar.tsx
│       │   │       ├── card.tsx
│       │   │       ├── carousel.tsx
│       │   │       ├── chart.tsx
│       │   │       ├── checkbox.tsx
│       │   │       ├── collapsible.tsx
│       │   │       ├── command.tsx
│       │   │       ├── context-menu.tsx
│       │   │       ├── dialog.tsx
│       │   │       ├── drawer.tsx
│       │   │       ├── dropdown-menu.tsx
│       │   │       ├── empty.tsx
│       │   │       ├── field.tsx
│       │   │       ├── form.tsx
│       │   │       ├── hover-card.tsx
│       │   │       ├── input-group.tsx
│       │   │       ├── input-otp.tsx
│       │   │       ├── input.tsx
│       │   │       ├── item.tsx
│       │   │       ├── kbd.tsx
│       │   │       ├── label.tsx
│       │   │       ├── menubar.tsx
│       │   │       ├── navigation-menu.tsx
│       │   │       ├── pagination.tsx
│       │   │       ├── popover.tsx
│       │   │       ├── progress.tsx
│       │   │       ├── radio-group.tsx
│       │   │       ├── resizable.tsx
│       │   │       ├── scroll-area.tsx
│       │   │       ├── select.tsx
│       │   │       ├── separator.tsx
│       │   │       ├── sheet.tsx
│       │   │       ├── sidebar.tsx
│       │   │       ├── skeleton.tsx
│       │   │       ├── slider.tsx
│       │   │       ├── sonner.tsx
│       │   │       ├── spinner.tsx
│       │   │       ├── switch.tsx
│       │   │       ├── table.tsx
│       │   │       ├── tabs.tsx
│       │   │       ├── textarea.tsx
│       │   │       ├── toast.tsx
│       │   │       ├── toaster.tsx
│       │   │       ├── toggle-group.tsx
│       │   │       ├── toggle.tsx
│       │   │       └── tooltip.tsx
│       │   ├── hooks/
│       │   │   ├── use-mobile.tsx
│       │   │   └── use-toast.ts
│       │   ├── lib/
│       │   │   └── utils.ts
│       │   ├── App.tsx
│       │   ├── index.css
│       │   └── main.tsx
│       ├── components.json
│       ├── index.html
│       ├── mockupPreviewPlugin.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── assets/   ← reserved (README only)
│   └── README.md
├── design/   ← reserved (README only)
│   └── README.md
├── docs/   ← the documentation corpus (spec/ · blueprint/ · documentation/ · contracts/ · status/ · upgradation/ · adr/ · the prompt set)
│   ├── _generated/
│   │   ├── index.md
│   │   └── tree.md
│   ├── _inbox/
│   │   ├── blueprint.md
│   │   ├── concept.md
│   │   ├── definitions.md
│   │   ├── directive.md
│   │   ├── directory.md
│   │   └── interface.md
│   ├── _meta/
│   │   └── frontmatter.schema.json
│   ├── adr/
│   │   ├── ADR-001.md
│   │   ├── ADR-002.md
│   │   ├── ADR-003.md
│   │   ├── ADR-004.md
│   │   ├── ADR-005.md
│   │   ├── ADR-006.md
│   │   ├── ADR-007.md
│   │   ├── ADR-008.md
│   │   ├── ADR-009.md
│   │   ├── ADR-010.md
│   │   └── ADR-011.md
│   ├── archive/
│   │   └── v4.5.1/
│   │       ├── documentation.md
│   │       └── README.md
│   ├── blueprint/
│   │   ├── architecture-edges.md
│   │   ├── data-edges.md
│   │   ├── foundations-edges.md
│   │   ├── lifecycle-edges.md
│   │   ├── modules-edges.md
│   │   ├── operations-edges.md
│   │   ├── reference-edges.md
│   │   ├── request-layer-edges.md
│   │   ├── structure.md
│   │   └── system-map.md
│   ├── contracts/
│   │   ├── commands.json
│   │   ├── config.schema.json
│   │   ├── errors.json
│   │   ├── events.catalog.json
│   │   ├── flow-suite.json
│   │   ├── module-manifest.schema.json
│   │   ├── openapi.yaml
│   │   ├── rbac.enums.json
│   │   └── ui-renderer.schema.json
│   ├── documentation/
│   │   ├── api/
│   │   │   ├── commands.md
│   │   │   ├── endpoints.md
│   │   │   ├── errors.md
│   │   │   ├── events.md
│   │   │   └── README.md
│   │   ├── features/
│   │   │   ├── core-command-surface.md
│   │   │   ├── data-and-state.md
│   │   │   ├── module-system.md
│   │   │   ├── observability.md
│   │   │   ├── permissions-rbac.md
│   │   │   ├── renderer-presentation.md
│   │   │   └── testing-and-flow.md
│   │   ├── guides/
│   │   │   ├── building-a-module.md
│   │   │   └── getting-started.md
│   │   ├── overview/
│   │   │   ├── closing.md
│   │   │   ├── concept-documentation.md
│   │   │   ├── core-ideology-the-seven-pillars.md
│   │   │   ├── engineering-philosophy.md
│   │   │   ├── introduction.md
│   │   │   ├── mission-statement.md
│   │   │   ├── table-of-contents.md
│   │   │   ├── the-competitive-landscape.md
│   │   │   ├── the-developer-model.md
│   │   │   ├── the-philosophy.md
│   │   │   ├── the-problem-why-dumby-exists.md
│   │   │   ├── the-unified-modular-doctrine.md
│   │   │   ├── trust-security-reliability.md
│   │   │   ├── vision-statement.md
│   │   │   ├── what-dumby-is-not.md
│   │   │   ├── what-dumby-is.md
│   │   │   └── who-dumby-is-for.md
│   │   └── index.md
│   ├── migration/
│   │   ├── ledger-template.md
│   │   └── migration-prompt.md
│   ├── orchestration/
│   │   └── master-prompt.md
│   ├── prompts/
│   │   ├── entry.md
│   │   └── meta-prompt.md
│   ├── scripts/
│   │   └── docs/
│   │       ├── check-acceptance.mjs
│   │       ├── check-anchor-paths.mjs
│   │       ├── check-anchors.mjs
│   │       ├── check-archive-guard.mjs
│   │       ├── check-asset-adaptation.mjs
│   │       ├── check-authority.mjs
│   │       ├── check-chain.mjs
│   │       ├── check-code-reconciliation.mjs
│   │       ├── check-contracts.mjs
│   │       ├── check-counts.mjs
│   │       ├── check-coverage.mjs
│   │       ├── check-entities.mjs
│   │       ├── check-facts.mjs
│   │       ├── check-frontmatter.mjs
│   │       ├── check-ledger-content.mjs
│   │       ├── check-manifest.mjs
│   │       ├── check-no-restatement.mjs
│   │       ├── check-normative-markers.mjs
│   │       ├── check-reconciliation.mjs
│   │       ├── check-status-evidence.mjs
│   │       └── check-terminology.mjs
│   ├── spec/
│   │   ├── architecture/
│   │   │   ├── application-bootstrap-lifecycle.md
│   │   │   ├── dependency-injection-service-container.md
│   │   │   ├── directory-file-structure.md
│   │   │   ├── graceful-shutdown-signal-handling.md
│   │   │   ├── system-architecture.md
│   │   │   └── technology-stack-decision-matrix.md
│   │   ├── data/
│   │   │   ├── caching-architecture.md
│   │   │   ├── configuration-management.md
│   │   │   ├── database-architecture.md
│   │   │   └── state-externalization-horizontal-scaling.md
│   │   ├── foundations/
│   │   │   ├── engineering-principles-p1-p14.md
│   │   │   ├── non-goals-explicit-boundaries.md
│   │   │   ├── the-unified-modular-doctrine.md
│   │   │   └── what-is-dumby.md
│   │   ├── governance/
│   │   │   ├── appendix-a-directive-to-blueprint-traceability.md
│   │   │   ├── appendix-b-compliance-self-audit-checklist.md
│   │   │   ├── appendix-c-logged-deviations-and-open-items.md
│   │   │   ├── directive-charter-how-to-use-this-document.md
│   │   │   ├── dumby-development-directive-rules.md
│   │   │   ├── part-1-foundations-doctrine.md
│   │   │   ├── part-2-technology-stack-runtime-boundaries.md
│   │   │   ├── part-3-application-core-bootstrap-lifecycle-di.md
│   │   │   ├── part-4-module-system-framework.md
│   │   │   ├── part-5-request-permission-data-architecture.md
│   │   │   ├── part-6-control-plane-services.md
│   │   │   ├── part-7-reliability-security-performance.md
│   │   │   └── part-8-quality-delivery-acceptance.md
│   │   ├── lifecycle/
│   │   │   ├── ci-cd-pipeline.md
│   │   │   ├── developer-experience-tooling.md
│   │   │   ├── development-workflow.md
│   │   │   ├── infrastructure-deployment.md
│   │   │   ├── testing-architecture-qa.md
│   │   │   ├── troubleshooting-operational-runbooks.md
│   │   │   └── versioning-release-migration.md
│   │   ├── modules/
│   │   │   ├── catalog/
│   │   │   │   └── catalog-conventions-illustrative-module-index.md
│   │   │   ├── building-a-module-a-complete-worked-example.md
│   │   │   ├── inter-module-communication-and-contracts.md
│   │   │   ├── marketplace-and-mdis.md
│   │   │   ├── module-anatomy-manifest.md
│   │   │   ├── module-tiers-lifecycle.md
│   │   │   └── swastik-hot-reload-dynamic-module-management.md
│   │   ├── operations/
│   │   │   ├── analytics-telemetry-mtp.md
│   │   │   ├── error-management-fault-tolerance.md
│   │   │   ├── job-queue-scheduling.md
│   │   │   ├── localization-internationalization.md
│   │   │   ├── multi-identity-operation-twill-personas.md
│   │   │   ├── observability-logging-metrics-tracing.md
│   │   │   ├── performance-scalability-engineering.md
│   │   │   ├── privacy-gdpr-compliance.md
│   │   │   └── security-architecture-threat-model.md
│   │   ├── orientation/
│   │   │   ├── complete-engineering-implementation-reference.md
│   │   │   ├── definitions.md
│   │   │   ├── front-matter.md
│   │   │   ├── how-to-read-this-reference.md
│   │   │   ├── rosetta-stone-conceptual-map.md
│   │   │   ├── system-at-a-glance.md
│   │   │   ├── table-of-contents.md
│   │   │   └── what-this-document-is.md
│   │   ├── reference/
│   │   │   ├── inline-status-entries/
│   │   │   │   ├── architecture.md
│   │   │   │   ├── lifecycle.md
│   │   │   │   ├── modules.md
│   │   │   │   ├── reference.md
│   │   │   │   └── request-layer.md
│   │   │   ├── appendices.md
│   │   │   ├── appendix-a-extended-reference-discord-api-surface.md
│   │   │   ├── appendix-b-extended-reference-interface-hub.md
│   │   │   ├── appendix-c-extended-reference-operational-excellence.md
│   │   │   ├── appendix-implementation-status-audit-register.md
│   │   │   ├── colophon.md
│   │   │   ├── dumby-vs-multipurpose-bots-capability-comparison.md
│   │   │   ├── glossary-topic-index.md
│   │   │   ├── mandatory-feature-compliance-matrix.md
│   │   │   └── rest-api-webhooks-mdis-reference.md
│   │   └── request-layer/
│   │       ├── command-framework-routing-engine.md
│   │       ├── control-plane-services.md
│   │       ├── discord-facing-interface-frontend-surfaces.md
│   │       ├── division-0-system-overview-the-core-command-surface.md
│   │       ├── division-1-the-renderer-presentation-authority.md
│   │       ├── division-10-hello-world-standard-tier-module.md
│   │       ├── division-11-cross-cutting-ui-specifications.md
│   │       ├── division-2-interaction-lifecycle-buffer-notices-components.md
│   │       ├── division-3-dashboard-home-page-core-commands.md
│   │       ├── division-4-health-command-health-module.md
│   │       ├── division-5-browse-command-marketplace-module.md
│   │       ├── division-6-queue-command-bccm-queue-module.md
│   │       ├── division-7-persona-command-persona-module-twill.md
│   │       ├── division-8-permit-command-rbac-permission-module.md
│   │       ├── division-9-modules-command-module-management-module.md
│   │       ├── event-architecture-bus-system.md
│   │       ├── front-matter.md
│   │       ├── interaction-component-handling.md
│   │       ├── middleware-pipeline-interceptors.md
│   │       ├── permission-authorization-engine.md
│   │       └── table-of-contents.md
│   ├── status/
│   │   ├── authority.json
│   │   ├── capabilities.json
│   │   ├── classification.json
│   │   ├── code-reconciliation.json
│   │   ├── counts.json
│   │   ├── coverage-ledger.json
│   │   ├── entities.json
│   │   ├── facts.json
│   │   ├── reconciliation.json
│   │   ├── section-order.json
│   │   └── terminology.json
│   ├── upgradation/
│   │   ├── change-log.md
│   │   └── README.md
│   ├── glossary.md
│   ├── manifest.json
│   └── README.md
├── lib/   ← Replit scaffold — NOT the bot (Drizzle/Orval/React)
│   ├── api-client-react/
│   │   ├── src/
│   │   │   ├── generated/
│   │   │   │   ├── api.schemas.ts
│   │   │   │   └── api.ts
│   │   │   ├── custom-fetch.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── api-spec/
│   │   ├── openapi.yaml
│   │   ├── orval.config.ts
│   │   └── package.json
│   ├── api-zod/
│   │   ├── src/
│   │   │   ├── generated/
│   │   │   │   ├── types/
│   │   │   │   │   ├── healthStatus.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── api.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── db/
│       ├── src/
│       │   ├── schema/
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/   ← workspace packages
│   ├── modules/   ← the eight first-party modules: browse · dashboard · health · hello-world · modules · permit · persona · queue
│   │   ├── browse/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── browse.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── dashboard/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── dashboard.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── health/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── health.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── hello-world/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── hello.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── modules/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── modules.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── permit/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── permit.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── persona/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── persona.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── queue/
│   │   │   ├── assets/
│   │   │   │   └── .gitkeep
│   │   │   ├── config/
│   │   │   │   └── .gitkeep
│   │   │   ├── events/
│   │   │   │   └── .gitkeep
│   │   │   ├── jobs/
│   │   │   │   └── .gitkeep
│   │   │   ├── locales/
│   │   │   │   └── en-US.json
│   │   │   ├── migrations/
│   │   │   │   └── .gitkeep
│   │   │   ├── repositories/
│   │   │   │   └── .gitkeep
│   │   │   ├── services/
│   │   │   │   └── .gitkeep
│   │   │   ├── src/
│   │   │   │   ├── commands/
│   │   │   │   │   └── queue.command.ts
│   │   │   │   └── index.ts
│   │   │   ├── tests/
│   │   │   │   └── .gitkeep
│   │   │   ├── ui/
│   │   │   │   └── .gitkeep
│   │   │   ├── manifest.json
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── README.md
│   │   └── eslint.config.mjs
│   └── swastik/   ← the module-authoring package + _template (the only import surface for a module)
│       ├── _template/
│       │   ├── assets/
│       │   │   └── .gitkeep
│       │   ├── commands/
│       │   │   └── .gitkeep
│       │   ├── config/
│       │   │   └── .gitkeep
│       │   ├── events/
│       │   │   └── .gitkeep
│       │   ├── jobs/
│       │   │   └── .gitkeep
│       │   ├── locales/
│       │   │   └── .gitkeep
│       │   ├── migrations/
│       │   │   └── .gitkeep
│       │   ├── repositories/
│       │   │   └── .gitkeep
│       │   ├── services/
│       │   │   └── .gitkeep
│       │   ├── tests/
│       │   │   └── .gitkeep
│       │   ├── ui/
│       │   │   └── .gitkeep
│       │   ├── README.md
│       │   └── manifest.ts
│       ├── src/
│       │   ├── entrypoints/
│       │   │   ├── admin.ts
│       │   │   ├── core.ts
│       │   │   ├── marketplace.ts
│       │   │   └── standard.ts
│       │   ├── commands.ts
│       │   ├── index.ts
│       │   └── manifest.ts
│       ├── package.json
│       └── tsconfig.json
├── scripts/   ← workspace scripts
│   ├── src/
│   │   └── hello.ts
│   ├── package.json
│   ├── post-merge.sh
│   └── tsconfig.json
├── specs/   ← reserved (README only)
│   └── README.md
├── tools/   ← developer tooling
│   └── release_manager/   ← the Release Manager gate: release-gate.ts · compatibility-ledger.json
│       ├── README.md
│       ├── compatibility-ledger.json
│       ├── package.json
│       ├── release-gate.ts
│       └── tsconfig.json
├── website/   ← reserved (README only)
│   └── README.md
├── .gitignore
├── .npmrc
├── .replit
├── .replitignore
├── AGENTS.md
├── GAP_MANIFEST.md
├── README.md
├── STATUS.md
├── migration-ledger.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── replit.md
├── replit.nix
├── tsconfig.base.json
└── tsconfig.json
```

## Runtime module topology (not in the repository)

```
/mnt/modules/
├── swastik-staging/       ← upload · validation · build area
├── modules-admin/         ← Admin-tier modules only
├── modules-core/          ← Core-tier modules only (seeded via promotion)
├── modules-standard/      ← Standard-tier modules only
└── modules-marketplace/   ← Marketplace-tier modules only
```

A module's tier is enforced at rest: it must live on the volume matching its declared tier.
The eight first-party modules are authored at `packages/modules/<slug>/` and seeded onto
their tier volume through the Swastik promotion pipeline (ADR-005).
