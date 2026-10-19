---
id: SPEC-07-LIFECYCLE-0041
title: 41. Infrastructure & Deployment
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [INFRASTRUCTURE_DEPLOYMENT, DOCKER_MULTI_STAGE_BUILD, KUBERNETES_REFERENCE_CONFIGURATION, SHARDING_TOPOLOGY_IN_KUBERNETES, TERRAFORM_INFRASTRUCTURE_AS_CODE, DEPLOYING_THE_CONTROL_PLANE, CLOUD_PROVIDER_REFERENCE_SIZING, RUNTIME_TUNING, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-LIFE-0041-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 41. Infrastructure & Deployment

**Status:** [SPEC]

### 41.1 Docker & Multi-Stage Build

```
DIAGRAM 41-A — Multi-stage Dockerfile structure

STAGE 1 — builder
  FROM node:22-slim
  install the FULL dependency tree (including devDependencies)
  run tsc -p tsconfig.build.json → compiled JS output

STAGE 2 — runtime
  FROM node:22-slim
  install ONLY production dependencies (--prod --frozen-lockfile)
  copy ONLY the compiled output from stage 1 (no TS source, no devDependencies,
  no test files)
  non-root user; read-only root filesystem where the base image permits
```

This keeps the shipped image free of anything not required to run the compiled application —
smaller attack surface, smaller image, faster pull. The build context is the workspace root,
never the application subdirectory.

### 41.2 Kubernetes Reference Configuration
> **Deployment path — reference vs in use.** The Kubernetes configuration below is the *reference target* topology. The path in use is **Railway** (a Dockerfile builder; see `deploy/railway.md`), which is not a cluster — the K8s manifest apply is therefore a target, not a verified deployment (`upgradation/change-log.md` OI-3). Where this chapter and `deploy/railway.md` differ, `deploy/railway.md` describes what runs today.


The reference deployment mounts the four per-tier module volumes plus staging at
`/mnt/modules/{admin,core,standard,marketplace,staging}` and sets `MODULES_DIR=/mnt/modules`;
no module content is baked into any image. The Release Manager runs as its own deployment with
least-privilege RBAC and reverse GitHub sync — every deployment change it applies is committed
back to the Git system-of-record.

```
TREE 41-A — k8s manifest organization

base/
  deployment.yaml      the bot Deployment
  service.yaml         ClusterIP, fronting the health/metrics/HTTP port
  configmap.yaml       non-secret configuration values
  serviceaccount.yaml
  hpa.yaml             HorizontalPodAutoscaler
  swastik-volumes.yaml the staging and live module volumes
overlays/
  staging/             Kustomize overlay: staging-specific replicas, resources, image tag
  production/          production-specific values; the ONLY overlay the production
                       workflow may apply
```

```
CODE REFERENCE 41-A — Deployment spec (representative slice)

strategy.type: RollingUpdate
  maxUnavailable: 0
  maxSurge: 1
terminationGracePeriodSeconds: 190        # worst-case 180 s shutdown + 10 s buffer
container dumby-bot:
  livenessProbe  → /health/liveness
  startupProbe   → /health/startup   failureThreshold: 30 (Stage 17 can take a while)
  readinessProbe → /health/readiness
```

**Deploy-manifest and environment-schema agreement is CI-enforced.** A verify-env job
cross-checks every key in the configmap and `.env.example` against the root schema and fails on
any unknown or missing key; a manifest validator validates every Kubernetes manifest against
its schema; and the bot deployment's strategy is verified to remain a rolling update with
`maxUnavailable: 0` (a silent regression to a recreate strategy fails the same job).

**Readiness and the live module volume.** Readiness (Stage 18) verifies the live volume is
actually serving modules — it stats the module root (detecting a stale or unmounted network
handle), confirms each declared tier directory is present and non-empty, and reads every
required module's manifest from the volume. Any failure returns 503 and removes the pod from
the service without restarting it.

### 41.3 Sharding Topology in Kubernetes

The bot runs as a `Deployment`, not a `StatefulSet`, deliberately: shard ownership is dynamic
and Redis-lock-mediated, not tied to a pod's stable network identity — any pod can claim any
currently-unowned shard range, so a plain deployment is the correct, sufficient primitive.

### 41.4 Terraform Infrastructure-as-Code

```
TREE 41-B — Terraform module organization

environments/
  staging/     environment-specific variable values, remote state backend
  production/  the same, with production values — never sharing a state file with staging
modules/
  database/    managed PostgreSQL instance, replica configuration, backup/retention,
               region (the data-residency hook)
  cache/       managed Redis instance
  kubernetes/  cluster provisioning, node-pool sizing
```

Database and cache **region** is an explicit, top-level variable in the database and cache
modules, so a data-residency requirement is satisfied by setting one Terraform variable per
environment.

### 41.5 Deploying the Control-Plane Services & Personas

Power Engine, CLAI, Swastik, and the Credentials Service each get their own deployment —
typically single-replica or small-replica-count — reachable only from within the cluster's own
network: CLAI's SSH listener and Power Engine's REST API are never exposed on a public-facing
service or ingress, and an operator reaches them through a bastion, VPN, or port-forward. A
persona deploys as an entirely separate instance of the bot deployment itself — same manifests,
same image, a different secret supplying its own distinct bot token. Worker processes deploy as
their own deployment with a worker role, running the truncated worker bootstrap — no gateway
connection, no API or health server — scaling on queue-depth and job-wait metrics.

### 41.6 Cloud Provider Reference — Sizing to Deployment Scale

```
TABLE 41-A — Deployment tier reference

Single-server operator
    one process, one small managed (or self-hosted) PostgreSQL, one small Redis. No read
    replicas, no autoscaler, no multi-approver release gate needed in practice.

Growing platform
    multiple bot pods behind an autoscaler, a managed PostgreSQL primary with at least one
    read replica, managed Redis, dedicated worker pods, staging mirroring production
    topology.

Large-scale fleet
    full sharding across many pods, multiple read replicas, dedicated worker pod pools per
    queue category, the full two-approver production gate, personas in active use for
    guilds pushing command-budget or voice-capacity limits.
```

### 41.7 Runtime Tuning

Container resource requests and limits are set per-environment overlay, sized against observed
steady-state memory and CPU from staging load testing rather than guessed — a memory limit set
too tight risks the container being OOM-killed mid-command.

### 41.8 How To Verify This Section Against the Code

- The Dockerfiles and compose: `apps/main/docker/`, `apps/main/docker-compose.yml`.
- The Kubernetes manifests: `apps/main/deploy/k8s/base/`, `apps/main/deploy/k8s/overlays/`.
- The Terraform modules: `apps/main/deploy/terraform/modules/`,
  `apps/main/deploy/terraform/environments/`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0041-1
  check: "Docker is a multi-stage build; K8s sets terminationGracePeriodSeconds=190 and the 3 probes"
  test: tests/ci/infra.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `CI-enforced`, `CVEs`, `Grype`, `READMEs`, `Reasonable`, `Trivy`, `httpGet`
**config/env constants:** `limits.memory`

