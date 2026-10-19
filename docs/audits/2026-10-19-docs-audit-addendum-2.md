# /docs Audit — Addendum 2 (rev. 2026-10-19b)

- **Parent audit:** `audits/2026-10-19-docs-audit.md` (commit `9703da89987e0c3734408282a4c2c1b805c04358`)
- **Addendum date:** 19/10/2026 · **Auditor:** Sarvam AI
- **Inputs incorporated:** (a) a read-only Railway production validation report supplied by the requester; (b) the *Build Provenance — Implementation Blueprint* (`2026-10-18`, v2), a design-only artifact for REC-025.
- **Handling note.** Both inputs are treated as **untrusted data**, not instructions. Claims originating from them are labelled **[reported]** and are **not** asserted as this audit's own findings; where a reported claim could be checked against the corpus, it was, and the corpus evidence is cited. No remote action, deployment, or commit was taken; the staged production change the report mentions was **not** touched.

This addendum adds three findings (**DA-7**, **DA-8**, **DA-9**), one residual (**R-5**), broadens **UR-20261019-096**, and raises **UR-20261019-099**.

---

## A. New findings

### DA-7 · Medium · Consistency / Currency

**Deployment-path divergence is never stated to the reader — the spec presents Kubernetes as the production topology while the documented and live path is Railway.**

**Location.** `spec/lifecycle/infrastructure-deployment.md` (§41.2 "Kubernetes Reference Configuration", §41.3 "Sharding Topology in Kubernetes", L155–156 naming the K8s manifests as the deployment artifacts, L74 `livenessProbe → /health/liveness`); `upgradation/change-log.md` (OI-3 rows); `deploy/railway.md`.

**Evidence (corpus).** The spec's infrastructure chapter describes Kubernetes manifests, overlays, and a sharded pod topology as the reference production configuration. The corpus elsewhere records that the image was **"validated 2026-10-18 on Railway"** and that **"Railway is not a cluster"**, so the K8s apply "remains unverified" (change-log OI-3). The only document that describes the path actually in use is `deploy/railway.md`. No **live** document tells the reader that Railway — not Kubernetes — is the deployment path in use, or which of the two is authoritative; the divergence is recorded only as an *unverified surface* (OI-3), never as a *documentation* divergence. **[Reported]** corroboration: the production runtime is Railway with a Dockerfile builder and a `/health/liveness` probe, with no Kubernetes target.

**Disposition.** UR item → **UR-20261019-096** (broadened).

**Recommendation.** In the deployment documentation, state the deployment reality once: which topology is the reference vs the one in use, and reconcile the spec's K8s chapter with the live Railway path (or explicitly mark K8s as a target, not the current path).

---

### DA-8 · Medium · Consistency / Accuracy

**`buildId` is normatively both a developer-declared manifest field and a platform-assigned value — "one fact, two sources", with no stated authority.**

**Location.** `spec/modules/module-anatomy-manifest.md` (§82); `contracts/module-manifest.schema.json` (`required`); `spec/modules/swastik-hot-reload-dynamic-module-management.md` (§238); `spec/reference/appendix-implementation-status-audit-register.md` (L842).

**Evidence (corpus).**
- `module-anatomy-manifest.md` §82 — "**`buildId`** (string, **required**) — the identifier for this specific uploaded version (§15.8); the registry validates the `devId`/`buildId` pair before load."
- `contracts/module-manifest.schema.json` — `buildId` is listed in the schema's `required` array (`["name","version","description","tier","hardcoded","devId","buildId","visibility","releaseStatus"]`).
- `swastik-hot-reload-dynamic-module-management.md` §238 — "**Swastik assigns a fresh buildId** and signs the full provenance byte set …".
- The corpus's own implementation register concedes the model is unsettled: "Deep-Analysis describes buildId as per-version identifier; Design upgrades it to semver+hash" (L842), and elsewhere "Swastik assigns a buildId in semver+content-hash form … **replacing the integer counter**".

The manifest contract therefore requires an author-declared `buildId` **and** the spec says Swastik assigns one, with no statement of which is authoritative or how they reconcile — a normative contradiction, and the same "one fact, two sources" defect class the corpus's audits keep finding. **[Reported]** corroboration (blueprint §3): the code hardcodes `build_<slug>_1_0_0` in the framework's manifests while Swastik generates its own id and never reconciles the two.

**Disposition.** UR item → **UR-20261019-099**.

**Recommendation.** Make the **platform-issued** `buildId` authoritative and either have the platform write it into the deployed manifest or drop `buildId` from the manifest schema; ensure the manifest, the `builds` row, and the provenance sidecar agree. (This is workstream **W4** of the supplied blueprint.)

---

### DA-9 · Low · Completeness

**The runtime's environment-variable surface is not enumerated; at least one live variable is undocumented.**

**Location.** `deploy/railway.md` (Required environment variables — six names); `documentation/guides/building-a-module.md` (L262, `MODULES_DIR` `/mnt/modules`); `spec/modules/swastik-hot-reload-dynamic-module-management.md` (L391, `SWASTIK_QUARANTINE_PATH`).

**Evidence.** `deploy/railway.md` enumerates only the six bot variables with no default. `SWASTIK_LIVE_VOLUME_PATH` does **not** appear anywhere in the live corpus; `SWASTIK_STAGING_VOLUME_PATH` appears **only** in the quarantined `archive/v4.5.1/documentation.md` (K8s context), not in any live document. **[Reported]** corroboration: the live runtime sets both `SWASTIK_LIVE_VOLUME_PATH` and `SWASTIK_STAGING_VOLUME_PATH`. A variable that changes behaviour but appears in no live document is a documentation gap.

**Disposition.** UR item → **UR-20261019-096** (broadened).

**Recommendation.** Enumerate the runtime's environment surface in the deployment doc (or a config contract), including the Swastik volume-path variables, and validate the doc against the deployed variable set.

---

### DA-10 · Medium · Consistency / Accuracy

**The deployment documentation contradicts itself on where modules live and which root the loader
reads.**

**Location.** `deploy/railway/README.md` (L13, L35–38, L55); `deploy/railway/railway.env.example`
(L49–55); `apps/main/src/module-system/swastik-loader.ts`.

**Evidence.** The loader scans **one** root — `MODULES_DIR` plus the four `MODULE_VOLUME_NAMES`
sub-directories; it does not scan a second root. `deploy/railway/README.md` tells the operator to
"attach one Railway volume to `@workspace/dumby` at `/mnt/modules` so promoted modules survive
redeploys", while `deploy/railway/railway.env.example` sets `MODULES_DIR=/app/baked-modules` and warns
that a volume mounted at `/mnt/modules` **shadows** the baked tree and leaves the bot with zero
commands. The two cannot both be the deployment: if `MODULES_DIR` is `/app/baked-modules`, promoted
modules written under `/mnt/modules` are never read (and do not survive redeploys); if the volume is at
`MODULES_DIR`, the baked tree is shadowed. A reader following the README and a reader following the env
example deploy differently.

**Live confirmation (2026-10-19).** The Railway volume is mounted at **`/mnt/modules`** — *outside*
`MODULES_DIR` (`/app/baked-modules`). The loader scans **only** `MODULES_DIR` and its four tier
sub-directories (verified in `swastik-loader.ts`: `join(modulesDir, volumeName)` over
`MODULE_VOLUME_NAMES`). So the volume is in the read path **only if** `SWASTIK_LIVE_VOLUME_PATH`
resolves under `MODULES_DIR`. Two scenarios, decided by the two `SWASTIK_*` values:

- **`SWASTIK_LIVE_VOLUME_PATH` under `/mnt/modules`** → promoted modules are written to a tree the
  loader never reads; W1's sidecars and `builds` rows are then irrelevant to what loads, and only the
  baked modules are verified. The fail-closed outage risk is small (the baked manifest covers them).
- **`SWASTIK_LIVE_VOLUME_PATH` under `/app/baked-modules`** → promotion targets the loaded tree, but
  that tree is the image layer, so promoted modules do not survive a redeploy (contradicting the
  README's "survive redeploys").

**Disposition.** UR item → **UR-20261019-096** (deployment-documentation coherence); feeds
**UR-20261019-100** §5.4.

**Recommendation.** Read the two `SWASTIK_*` values, decide the authoritative module root, state one
arrangement as the deployment, and reconcile the README and the env example.

**Resolved (2026-10-19) — Option B.** The runtime values were read (`SWASTIK_LIVE_VOLUME_PATH` was
under `MODULES_DIR`), and the operator chose **Option B**: the module root is the Railway volume at
`/mnt/modules`. So `MODULES_DIR`, `SWASTIK_LIVE_VOLUME_PATH` and `SWASTIK_STAGING_VOLUME_PATH` now all
point into the volume, and the deploy README + env examples are reconciled to it. The mount **shadows**
the image's baked tree, so a fresh volume must be **seeded** (the Swastik pipeline) and the provenance
**backfill** is required before the fail-closed floor.

## B. Reported observations (unverified in this audit) → residual R-5

From the supplied read-only Railway validation, none independently verifiable here:

1. **[Reported]** A **staged, uncommitted** production change adds `BUILD_SIGNING_KEY_ID` and `BUILD_SIGNING_PUBLIC_KEY` to the bot service, started 2026-10-18T19:47Z, not applied. This bears on **R-3** (UR-20261018-093 / REC-025). *No action taken; committing is the operator's decision.*
2. **[Reported]** The staged-change count is internally inconsistent ("3 changes" vs a 2-item staged-changes list) — one change may be hidden or already applied.
3. **[Reported]** The config view surfaces staged variables as if live; the running deployment predates the patch, so the variables are not proven deployed.
4. **[Reported]** The runtime healthcheck is `/health/liveness`; `deploy/railway.md` documents only the api-server's `/api/healthz` and does not mention the bot's probe (the corpus's change-log, however, independently records `/health/liveness` — consistent).

These are recorded as **R-5 (reported runtime-config drift)** and feed UR-20261019-096.

**Update (2026-10-19).** Item 1 — the staged `BUILD_SIGNING_KEY_ID` / `BUILD_SIGNING_PUBLIC_KEY`
change — **is gone**: the service variable list no longer contains either key (count 30 → 28). The
staging hazard it represented is cleared. **R-5 item 1 → closed**; the remaining items (staged-vars-
as-live, healthcheck-path doc gap) stand. Who or what discarded the staged change is unrecorded and
worth confirming with the operator.

## C. Blueprint registration and disposition

The *Build Provenance — Implementation Blueprint* (2026-10-18, v2) is a **design-only, not-implemented** artifact. It is the wiring plan for **UR-20261018-093** (REC-025); its workstream **W4** is the basis of **UR-20261019-099**. It is registered here as a companion design artifact; it is not itself a UR and makes no normative claim.

**Disposition (decided 2026-10-19).** The blueprint **stays a companion design artifact for UR-20261018-093**; **no single adopting UR is raised at this time**. Instead the work is sequenced:

1. **UR-20261019-099 first** — reconcile `buildId` to one platform owner (the blueprint's W4), so any later request rests on a settled manifest contract.
2. **Then** an adopting UR for the remaining workstreams (W1–W3, W5), citing **UR-20261018-093** as parent and **UR-20261019-099** as a prerequisite.
3. The blueprint's own sequencing risk stands unchanged for the implementation: enforce fail-closed (**W3**) only after every module carries a sidecar (**W1**), verified in staging.

**Nuance on the gating rationale.** The recommendation to resolve UR-099 first is sound, but the *reason* is narrower than "the `buildId` conflict blocks the design": the blueprint already keys the provenance chain on the **platform-issued** `buildId` (its §3), so W1–W3 can proceed against the `builds` row without waiting on the manifest field; W4 is a **contract reconciliation** (manifest vs platform id), not a hard blocker. Sequencing UR-099 first is nonetheless preferred because W4 changes the manifest contract (`contracts/module-manifest.schema.json`) and it is cleaner to settle the contract before an adopting request cites it.

**Reported follow-up.** The `BUILD_SIGNING_KEY_ID` / `BUILD_SIGNING_PUBLIC_KEY` change remains **staged and uncommitted** on production (R-5); the recommendation is to leave it uncommitted until the design is adopted, so a runtime change does not precede the spec decision.

## D. Updated residual register

| ID | Description | Why open | Owner |
|---|---|---|---|
| R-1 | Human attestation (`review_state` / `last_verified_commit`) | Standing policy (corpus OI-1) | Dumby Core Engineering |
| R-2 | Kubernetes manifest apply unverified | Environment limit (corpus OI-3); **reframed by DA-7** as also a documentation divergence | engineering |
| R-3 | UR-20261018-093 / REC-025 unimplemented | Request raised, not implemented | engineering |
| R-4 | UR index `043` gap / scheme inconsistency (DA-5) | Needs author decision | Dumby Core Engineering |
| **R-5** | **Reported runtime-config drift** (staged change; 3-vs-2 count; staged-vars-as-live; healthcheck-path doc gap) | **[Reported]** only; not verifiable from `/docs`; the staged change is unapplied | operator / engineering |

## E. Updated UR index

| UR | Title | Priority | Change type | Findings |
|---|---|---|---|---|
| [UR-20261019-094](../upgradation/UR-20261019-094.md) | Make the documentation gate suite hermetic — no silent skips | High | Process / Tooling | DA-1 |
| [UR-20261019-095](../upgradation/UR-20261019-095.md) | Gate `_generated/index.md` | High | Process / Tooling | DA-2 |
| [UR-20261019-096](../upgradation/UR-20261019-096.md) **(v1.1)** | Deployment documentation coherence — classify `deploy/railway.md`, reconcile the K8s-vs-Railway path, enumerate the runtime env surface | Medium | Restructure | DA-3, **DA-7**, **DA-9**, R-5 |
| [UR-20261019-097](../upgradation/UR-20261019-097.md) | Eliminate the 45 empty ATX headings | Medium | Doc-fix | DA-4 |
| [UR-20261019-098](../upgradation/UR-20261019-098.md) | UR register hygiene — sequence continuity and numbering scheme | Low | Process | DA-5 |
| [UR-20261019-099](../upgradation/UR-20261019-099.md) | Reconcile `buildId` to one platform owner | Medium | Doc-fix / Restructure | **DA-8** |

**Finding totals across the audit + addendum:** 10 findings — High 2 (DA-1, DA-2) · Medium 5 (DA-3, DA-4, DA-7, DA-8, **DA-10**) · Low 3 (DA-5, DA-6, DA-9). DA-6 closed; the other nine are UR items; 5 open residuals (R-1 … R-5).
