---
id: SPEC-08-REFERENCE-0047
title: 47. Glossary & Topic Index
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [GLOSSARY_TOPIC_INDEX, GLOSSARY, TOPIC_INDEX_QUICK_NAVIGATION, SUPPLY_CHAIN_GATE_PNPM, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-REF-0047-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 47. Glossary & Topic Index

**Status:** [SPEC]

### 47.1 Glossary

```
TABLE 47-A — Term reference

Admin tier             the dev-guild-only, owner-only, middleware-bypassing module tier
BCCM                   Bot Command Cosmetics for Marketplace — guild-level command
                       rename/alias tooling
Buffer embed           the instant acknowledgment render issued on every interaction,
                       edited into the final render or the formal notice frame
CLAI                   Command Line Administrative Interface — the SSH-hosted operator
                       terminal over Power Engine's function catalogue
CommandContext         the per-interaction, scoped-container object carrying
                       correlationId, guildConfig, locale, rbacRole, logger, shardId,
                       and metadata
Compatibility Ledger   the machine-readable registry of every cross-boundary contract
                       version window; gates core releases and module deployments
Core tier              the permanently-loaded, non-disableable module tier, skipping RBAC
                       resolution by design
Credentials Service    the single, shared issuance path for every runtime credential
Deployment Record      the durable, append-only record binding a deployment's trigger,
                       identities, gate outcomes, and rollback result
DI Container           the dependency-injection service registry — the sole mechanism
                       for sharing services across the codebase
DumbyError             the abstract base class for the error taxonomy
Envelope encryption    root key → DEKs → per-record AES-256-GCM, for recoverable
                       in-process-readable credentials only; everything else stays
                       Argon2id-hashed
Formal notice frame    the merged failure/maintenance/unknown-command frame carrying a
                       reason code and the trace correlation id
Global Data Emit       the fifth sanctioned cross-module pattern — durable, schema'd
                       public datasets with a read/aggregate API
Grant                  a targeted Layer-7 guild-side override — permit, blacklist,
                       whitelist, cooldown, or rate-limit; module commands only
Hardcoded module       a module permanently pinned to one guild via hardcoded: true and
                       hardcodeGuildId; requires private visibility
Licence state machine  the six-state machine — pending → under-review → approved →
                       suspended ⇄ restored → revoked — governing every developer licence
Manifest               a module's complete, self-describing contract declaration
Marketplace tier       the opt-in-install module tier, reviewed through the five-gate
                       pipeline
MDIS                   Module Dashboard Interface System — the schema-driven web
                       configuration UI
Modes D/M/C            the Renderer's three density modes — detailed, medium, compact
Module                 the fundamental unit of feature ownership — a complete vertical
                       slice governed by one manifest
MTP                    Metric Track Protocol — module-agnostic usage metering in abstract
                       units
Persona                an additional, fully independent Discord application identity
                       running the same codebase
Power Engine           the global administrative authority, exposed as a function
                       catalogue
RBAC Group             a named mapping from Discord role(s) to a single Layer-7 grant
                       scope — never a rank source
Release Manager        the external, separately-built release actuator and deploy-path
                       system of record, with reverse GitHub sync
Renderer               the core-owned, single constructor of every Discord payload;
                       Components v2 grammar plus dynamic slots
Stampede Guard         the distributed-lock plus probabilistic-early-refresh mechanism
                       preventing cache-miss thundering herds
Standard tier          the pre-installed-but-guild-disableable module tier
Swastik                the deployment/hot-reload/hot-swap subsystem governing every
                       code-delivery path
Three-Layer Rule       command → service → repository, one-directional, inside every module
Tier                   a module's governance classification — Admin, Core, Standard, or
                       Marketplace
Tier volumes           the four per-tier module storage volumes plus staging; tier-at-rest
                       enforced
Token (DI)             a Symbol-based, unforgeable service identifier
Twill                  the subsystem governing persona creation, branding, and lifecycle
Visibility             the manifest's first-class public/unlisted/private enum, validated
                       at all three manifest validation points
```

### 47.2 Topic Index — Quick Navigation

```
TABLE 47-B — Section index by part

Part 0 — Orientation              §0.1–§0.4
Part I — Foundations & Philosophy §1 · §2 · §3 (P1–P14) · §4
Part II — Core Architecture       §5 · §6 · §7 · §8 · §9 · §10
Part III — The Module System      §11 · §12 · §13 · §14 · §15 · §16
Part IV — Request & Interaction   §17 · §18 · §19 · §20 · §21 · §22
Part V — Data & State             §23 · §24 · §25 · §26
Part VI — Reliability & Ops       §27 · §28 · §29 · §30 · §31 · §32 · §33 · §34 · §35
Part VII — Module Catalog         §36
Part VIII — Engineering Lifecycle §37 · §38 · §39 · §40 · §41 · §42 · §43
Part IX — Reference               §44 · §45 · §46 · §47 · §48
```

### 47.3 Supply-Chain Gate: the minimum release age

The workspace enforces a one-day release-age gate: newly published package versions cannot be
installed until they have aged a full day, insulating builds from yanked or compromised fresh
releases. Exclusions are governed policy — each entry carries a justification and is revisited
rather than added casually.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0047-1
  check: "Every glossary term resolves to a definition and matches `glossary.md`"
  test: tests/docs/glossary.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)

## Named entities

**classes, interfaces & symbols:** `Comms`
