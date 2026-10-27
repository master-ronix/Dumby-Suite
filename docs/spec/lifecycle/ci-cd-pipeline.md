---
id: SPEC-07-LIFECYCLE-0040
title: 40. CI/CD Pipeline
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [CI_CD_PIPELINE, CI_WORKFLOW_CI_YML, RELEASE_WORKFLOW_RELEASE_YML, MDIS_DASHBOARD_BACKEND_MISSING, HAPPY_PATH_SMOKE_TEST, PHASE_7_CI_CD, ROLLBACK_RETENTION_POLICY, STAGING_DEPLOYMENT_DEPLOY_STAGING, PRODUCTION_DEPLOYMENT_DEPLOY_PRODU, DEPENDENCY_REVIEW_DEPENDENCY_REVIE, WORKFLOW_SECURITY_CONVENTIONS, CONTRACT]
contracts: []
acceptance: [ACC-LIFE-0040-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 40. CI/CD Pipeline

**Status:** [SPEC]

### 40.1 The CI Workflow

Runs on every PR and every push to main, as a strict, fail-fast sequence.

```
DIAGRAM 40-A — The CI sequence

pnpm install --frozen-lockfile
  → tsc --noEmit               (typecheck, strict mode)
  → eslint .                   (lint, including every architecture-specific rule)
  → prettier --check .
  → vitest run --coverage      (the full unit + integration pyramid; coverage gates
                                enforced per layer)
  → tsc -p tsconfig.build.json (production build)
```

**Provenance binding.** Every build computes the source-archive hash, the compiled-artifact
hash, the lockfile hash, the gate-results hash, and an SBOM.

**Workflow location and definition of done.** All the workflows live at the repository root
under `.github/workflows/`. GitHub Actions never triggers a workflow from a subdirectory, so a
workflow file below the root is dead config — a CI check fails the build if a workflow file
appears anywhere but the root. The root `.github/` carries issue and PR templates and a
`CODEOWNERS` mapping every path to an owning reviewer (a PR touching crypto, authentication, or
the module loader routes to mandatory reviewers). The release workflow's publish step is real —
it builds, tags, and publishes with provenance attestations, not a dry-run. The definition of
done for any change is the **integration** tier: complete when the integration suite passes in
the pipeline, not when unit tests alone pass.

### 40.2 The Release Workflow

Triggered on merge to main. It computes the next semver bump from accumulated changeset files
and publishes — tagging the release and generating the changelog fully automatically, with no
manual version-bump commit.

**Two distinct update paths.** A **core change** goes CI build → automatic staging →
two-approver review gate → rolling rollout (the mandatory human checkpoint before any core
release reaches production). A **module-only change** goes Swastik upload → manifest validation
→ atomic symlink swap, with no core restart. The two paths are independent: a module-only
change never triggers a core image rebuild or rollout. A core restart is triggered only by an
actual core release, not a fixed timer — restart cadence follows release cadence. Deployment
audit tracking is keyed on the Swastik audit log (per-version, per-action records) rather than
the Git SHA, so module-only changes that never touch main are still tracked and attributable.

### 40.3 Staging Deployment

Triggered automatically on every merge to main, with no manual approval — the low-stakes,
fast-feedback target where the rolling-update mechanism, the release's database migrations, and
the full feature set are exercised against real (non-production) infrastructure.

### 40.4 Production Deployment

Requires an explicit **two-approver manual gate** — two distinct human approvals, not one —
reflecting that a production deployment can affect every guild simultaneously. Once approved,
it executes the identical zero-downtime rolling-update mechanism the rest of the architecture
uses — exactly one rollout mechanism in the whole system.

**Emergency break-glass procedure.** During a verified emergency, a single approver holding a
verified second factor may deploy a hotfix without the second approval, subject to a written
post-mortem obligation tracked as a mandatory post-incident review. The override is recorded in
the audit log alongside normal deployment entries.

**The Release Manager is an external, separately built, coordinated release actuator** — never
inside the application source tree. It has its own repository, build artifact, and deployment,
with deliberately narrow Kubernetes RBAC: its service account cannot read secrets, delete
volumes, or mutate RBAC, and a network policy restricts it to private-network access.

### 40.5 Dependency Review

Runs on any PR introducing or updating a dependency, blocking on critical or high-severity
known vulnerabilities (the mechanism is specified in §32.5).

```
TABLE 40-A — Workflow summary

ci.yml                  every PR, every push to main    fully automated
release.yml             merge to main                    fully automated
deploy-staging.yml      merge to main                    fully automated
deploy-production.yml   manual dispatch / post-staging   two-approver manual gate, always
dependency-review.yml   PR touching dependencies         automated, severity-gated
```

### 40.6 Workflow Security Conventions

Secrets reach steps as step-level environment values or over stdin — never as command-line
arguments (they surface in process listings and CI logs). Kubernetes credentials never persist
on the runner: a deploy step materializes its kubeconfig in a temp file, applies it, and
removes it in an exit trap within the same step. GitHub Actions are pinned by full commit SHA —
never by tag or branch — and a dependabot config keeps both package dependencies and pinned
actions current. A CI check (`check-workflows.mjs`) fails the build on any workflow that
violates these conventions — an unpinned action, a secret on a command line, or a kubeconfig
outside the temp-file/trap pattern.

### 40.7 How To Verify This Section Against the Code

- The six workflows: `.github/workflows/` (note: GitHub Actions reads the root
  `.github/`, so a nested `apps/main/.github/` is inert).
- The CODEOWNERS file: `.github/CODEOWNERS`.
- The supply-chain gate: `pnpm-workspace.yaml` (`minimumReleaseAge`).

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0040-1
  check: "CI runs the documented stages with SHA-pinned actions; Dependabot is enabled; secrets never appear on command lines"
  test: tests/ci/pipeline.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `Dead-code`, `Unfulfilled`, `release-manager.js`, `release-manager.ts`
**files & artifacts:** `core/commands/__tests__/`

