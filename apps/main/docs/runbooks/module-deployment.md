# Runbook — Module Deployment (the sanctioned pathway)

**Authority:** `docs/spec/modules/marketplace-and-mdis.md`, `docs/spec/modules/swastik-hot-reload-dynamic-module-management.md`,
`docs/spec/modules/module-anatomy-manifest.md`, `docs/spec/governance/part-4-module-system-framework.md` (rule D-4.10).
**Scope:** how a module reaches a running bot. There is **one** pathway — the microservice bundle
(Swastik + Credentials Service, with Power Engine and CLAI as operator surfaces). Pushing files
directly onto a tier volume, committing modules into the image, or importing an unsigned bundle are
**not** supported and are refused by the loader.

This runbook is application-local and non-normative; the corpus under `docs/` is the authority.

## Services and the ports they bind

| Service | Entry | Default port | Role in the pathway |
|---|---|---|---|
| Swastik | `src/entry/swastik.ts` | 8085 | developer registry, upload + build staging, promotion, reload |
| Credentials Service | `src/entry/credentials.ts` | 8086 | issues developer credentials (devId keyId + secret), verifies |
| Power Engine | `src/entry/power-engine.ts` | 8083 | operator function dispatch (`/api/power-engine/:functionName`) |
| CLAI | `src/entry/ssh-clai.ts` | 8084 (SSH) | operator console |

All service-to-service routes are gated by `x-internal-api-key` (`INTERNAL_API_KEY`). Developer
self-service routes are gated by the developer's own bearer credential. The Swastik route policy
(`shouldProtectSwastikRoute`) is **fail-closed**: a route is authenticated unless it is deliberately
exempted.

## The pathway, step by step

### 1. Register a developer profile — issues the devId and a credential

```
POST /swastik/developers/register        (x-internal-api-key)
  { "username": "<unique handle>" }
```

- Swastik mints a `devId` and delegates **credential issuance** to the Credentials Service
  (`POST /credentials/issue-devid`). Swastik never stores a secret — only the credential's `keyId`.
- A **pending licence** is created in the same call.
- The response carries the credential **once**: `{ keyId, secret, format: "<keyId>.<secret>" }`. Store
  it; it is never shown again.

Developer self-service: `GET /swastik/developers/me` (developer bearer credential).

### 2. Approve the developer — activates the licence

```
POST /internal/developers/:devId/approve    (x-internal-api-key)
  { "approvedBy": "<operator>" }
```

- Sets `developers.approvalStatus = 'approved'` and activates the licence
  (`pending → under-review → approved`), so the licence authorises a deploy.
- Decline instead: `POST /internal/developers/:devId/decline` — sets `declined` and revokes the
  licence. Both write an audit row.

A developer that is not `approved`, or whose licence is not `approved`, **cannot deploy** — `/internal/deploy`
refuses it (403) and records the attempt as a pending approval request.

### 3. Upload the module — stages the build and issues the buildId

```
POST /swastik/modules/upload             (developer bearer credential)
```

- Validates the manifest against `@workspace/swastik`'s schema (`.strict()`: an unknown field fails —
  including an author-declared `buildId`, which is **platform-issued**, not a manifest field).
- Mints the **buildId** (`build_<hex>`) and stages the bundle.
- Inspect: `GET /swastik/modules/:slug/builds/:buildId`.

### 4. Deploy — promotes the staged build into its tier volume

```
POST /internal/deploy                    (x-internal-api-key)
  { moduleSlug, version, devId, manifest, indexSource }
```

- Checks the developer is registered **and** approved, and that the licence authorises the deploy.
- Verifies the staged build (`verifyStagedBuild`), decides the promotion gate
  (`decidePromotionGate`), promotes atomically under a Redis lock, signs the build provenance, and
  records a `deployment_records` row.
- The module lands in the tier volume its manifest `tier` names
  (`modules-admin|core|standard|marketplace` under `MODULES_DIR`, default `/mnt/modules`).

### 5. Reload — pick the module up without a restart

```
POST /internal/reload                    (x-internal-api-key)
```

### 6. First-party modules (Option A) — after the service is up

> **First promotion needs a human.** ADR-006 requires explicit approval for a module's *first*
> promotion. The production boot seed approves only when the operator sets `MODULE_SEED_HUMAN_APPROVED=true`
> once (then removes it); without it, every first promotion is refused and nothing is pushed. The
> in-container flow never self-approves.

The image ships **no** modules (UR-20261019-102). First-party modules reach their tier volumes through
the same flow:

```
pnpm --filter @workspace/dumby build:modules   # builds each first-party package + signs provenance
pnpm --filter @workspace/dumby push:modules    # POSTs each bundle to /internal/deploy
```

`push:modules` takes the Swastik base URL as its first argument (default
`http://127.0.0.1:$SWASTIK_PORT`) and needs `INTERNAL_API_KEY`.

## Load-time verification (why a module with no provenance is refused)

At boot the loader (`src/module-system/swastik-loader.ts`) requires, for every module on a tier
volume:

1. a **build-provenance sidecar** (`build-provenance.json`) — no sidecar ⇒ refused;
2. a `builds` **row** for its buildId with `sourceArchiveHash`, `artifactHash`, `lockfileHash`,
   `gateResultsHash` — a missing column ⇒ refused;
3. an **artifact hash** that matches the row — a mismatch ⇒ refused;
4. a build that is **not revoked** (`validationStatus !== 'rejected'`) — a revoked build ⇒ refused;
5. a valid **Ed25519 signature** over the provenance tuple (layer L2, mandatory).

Bootstrap arms the verifier from `BUILD_SIGNING_KEY_ID` + `BUILD_SIGNING_PUBLIC_KEY` (or
`BUILD_SIGNING_PRIVATE_KEY`); with none armed, **boot fails** — a deployment must configure the key.
Generate a keypair with `apps/main/scripts/gen-l2-key.sh`.

## Verify the deployment

- `GET /swastik/status` — developer, build and approval counts.
- Swastik audit trail: `audit_logs` (source `SWASTIK`); each approval/decline/deploy writes a row.
- Deployment records: the `deployment_records` table.
- The bot logs `module-provenance-refused` (with the reason) for any module the loader rejects, and
  `module-provenance-unverified` only when no build store is supplied.

## Failure modes

| Symptom | Cause | Action |
|---|---|---|
| Boot fails: `BUILD_SIGNING_KEY_ID + BUILD_SIGNING_PUBLIC_KEY … required` | no signing key configured | set the keypair (step: `gen-l2-key.sh`) |
| `module-provenance-refused: no build-provenance sidecar` | a module was placed on a volume without going through `/internal/deploy` | re-deploy it through the flow |
| `403 developer not approved` | step 2 not done | approve the developer |
| `403 no license is registered` / licence not `approved` | licence not activated | approve the developer (activates it) |
| `on-disk artifact hash does not match the builds row` | the volume copy differs from the promoted build | re-deploy |
| A module is absent after deploy | its tier volume is empty (Option A image ships none) | run `build:modules` + `push:modules` |
