---
id: SPEC-01-FOUNDATIONS-0001
title: 1. What Is Dumby
kind: spec
status: normative
version: 5.0.0
authority_scope: [01-foundations]
anchors: [WHAT_IS_DUMBY, ONE_SENTENCE_DEFINITION, THE_LOAD_BEARING_IDEA, VISION_STATEMENT, MISSION_STATEMENT, DESIGN_PILLARS, WHAT_DUMBY_IS_NOT, WHO_DUMBY_IS_FOR, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-FOUND-0001-1, ACC-FOUND-0001-2]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 1. What Is Dumby

**Status:** [SPEC]

### 1.1 One-Sentence Definition

Dumby is a **Unified Modular Bot System**: a single TypeScript application runtime —
one process family, one dependency graph, one event bus, one permission engine, one
configuration system — into which independently-authored, independently-versioned,
independently-toggleable **modules** are loaded as the exclusive source of every
behaviour the bot exhibits, administrative capability included.

That sentence describes the repository, not a hope. The application is `apps/main`
(package `@workspace/dumby`), a pnpm workspace member that declares `"type": "module"`,
requires Node ≥ 22 and pnpm ≥ 9, and is compiled from TypeScript in strict mode
(`apps/main/package.json`). Feature modules are deliberately *not* baked into that
application: they are authored under `packages/modules/<slug>/` and reach a running pod
only through the Swastik promotion path onto the four per-tier volumes (§7.3, §15).
Eight first-party modules ship this way — `browse`, `dashboard`, `health`, `hello-world`,
`modules`, `permit`, `persona`, `queue` — as ordinary packages, indistinguishable in
contract from a third-party submission.

### 1.2 The Load-Bearing Idea — The Framework Never Special-Cases Itself

Every other design decision in this reference is a consequence of one rule: **the
framework does not special-case itself.** The commands that let a guild owner enable or
disable features are themselves shipped as a module. The service that persists per-guild
settings is a module. Moderation, welcome messages, logging configuration — all modules,
loaded through the identical manifest contract, the identical DI container, the identical
lifecycle hooks a third-party author would use next year. There is no privileged,
framework-only code path unavailable to a module author.

This is what makes "unified" more than marketing language: the framework's own
first-party behaviour is *proof by construction* that the module contract is sufficient
for everything, because the framework is built on nothing else. The eight first-party
modules pass through the same Zod manifest schema (`module-system/manifest.schema.ts`)
and the same tier co-constraints (`module-system/tier-rules.ts`) that a community module
would, and are loaded by the same `ModuleRegistry` from the same tier volumes.

```
CONSEQUENCE CHECK — what "no self-special-casing" actually rules out

 ✗ A hidden config table only core code can write to
 ✗ A privileged import path bypassing the DI container
 ✗ An admin command implemented as inline framework code instead of a module
 ✗ A framework-only database connection that ignores repository ownership rules
 ✓ Every one of the above is expressed instead as: a module, a manifest, a
 declared dependency, a typed service contract
```

The rule has a sharp corollary, stated as engineering principle P1.2 and audited
independently: a first-party feature that is not hardened to the same standard as a
third-party one must *say so* — in code, in the change-log, and, where the tension is
architectural, in an ADR. Dishonesty about a feature's status is itself treated as a
defect (§4, the honesty boundary).

### 1.3 Vision Statement

A guild's bot should present as one coherent product with one settings surface — never a
federation of plugins an operator has to remember six unrelated environment variables
for. The engineering team behind it, meanwhile, should experience a set of
independently-shippable codebases that never block on each other, never break each
other, and can each be rewritten from zero without anyone else noticing.

### 1.4 Mission Statement

Provide a TypeScript framework in which shipping the fortieth feature is exactly as
safe, fast, and well-tested as shipping the first — by making isolation, typed
contracts, and observability the default path, not something a disciplined team must
remember to bolt on.

### 1.5 The Dumby Triad — Members, Operators, Developers

Three audiences consume the same system through three different lenses, and every
feature discussion is expected to name which one it serves:

- **Members** experience *one bot* — one identity, one command surface, one accent
  colour, one presentation grammar. The modularity is invisible to them by design.
- **Operators** (guild admins and bot owners) experience *one settings surface* — the
  Core Command Surface (`/dashboard`, `/health`, `/browse`, `/queue`, `/persona`,
  `/permit`, `/modules`) plus the marketplace, all rendered by the one core Renderer.
- **Developers** experience *a system* — a manifest contract, a DI container, an event
  catalogue, isolation rules enforced by tooling, and a promotion pipeline they share
  with the framework's own authors.

The doctrine that reconciles the three — "modular for members, unified for operators,
system for developers" — is developed in §2.

### 1.6 Design Pillars

```
TABLE 1-A — The Seven Design Pillars

┌────────────────────────────┬──────────────────────────────────────────────┐
│ Pillar │ What it means in practice │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Module Sovereignty │ A module owns its commands, tables, jobs, and │
│ │ config schema outright. Nothing outside it │
│ │ reaches into that state without a declared, │
│ │ typed interface. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Contract Over Convention │ Cross-module interaction happens through │
│ │ manifests, typed DI tokens, and a documented │
│ │ event catalog — never by importing another │
│ │ module's files or guessing its table names. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Fail Fast, Degrade │ Misconfiguration is caught at boot; the │
│ Gracefully │ process refuses to start half-broken. Once │
│ │ live, one module's failure degrades only │
│ │ the capability it owned — never cascades. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Observability By Default │ Every command, job, and lifecycle transition │
│ │ emits structured logs, metrics, and trace │
│ │ spans without hand-written instrumentation. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ One Operational Surface │ One Dockerfile, one health endpoint, one │
│ │ metrics endpoint, one config loader, one │
│ │ migration runner — regardless of module │
│ │ count. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ TypeScript as Design │ The module contract, DI container, event bus, │
│ Material │ and command interface are defined so a whole │
│ │ class of integration bug is rejected at │
│ │ compile time, before a test even runs. │
├────────────────────────────┼──────────────────────────────────────────────┤
│ Progressive Disclosure │ A first command touches one file, one │
│ │ interface. A stateful, job-scheduling, │
│ │ cache-backed module has the whole framework │
│ │ available — nothing forced on the simple │
│ │ case. │
└────────────────────────────┴──────────────────────────────────────────────┘
```

These seven pillars are not decorative: each is backed by a mechanism. Module
Sovereignty is enforced by ESLint isolation rules and the repository pattern; Contract
Over Convention by the manifest schema and the typed DI tokens; Fail Fast / Degrade by
the 18-stage bootstrap and the per-module error containment; Observability by the
middleware pipeline; One Operational Surface by the single bootstrap entrypoint;
TypeScript-as-material by strict mode and the global event-catalogue type merge;
Progressive Disclosure by the manifest's optional-field defaults.

### 1.7 What Dumby Is Not

- **Not a no-code bot builder.** Dumby is a code-first framework for engineers writing
  TypeScript modules. A module *can* expose a no-code-style configuration panel to
  guild admins via the MDIS schema (§16.4), but authoring a module itself is not no-code.
- **Not a single-file script.** There is no supported mode where Dumby runs as one flat
  entry file. The module boundary is structural, not a style preference.
- **Not a generic "everything" clone.** Dumby does not ship every conceivable feature
  pre-enabled for every guild; the Standard-tier catalog is curated and every module is
  independently disableable.
- **Not a multi-framework abstraction layer.** Dumby commits to one Discord integration
  library (§5.6) and uses its types and event model directly rather than hiding behind a
  lowest-common-denominator wrapper.
- **Not a SaaS product.** Dumby is a self-hostable framework. Nothing in this reference
  assumes a specific commercial hosting arrangement.

### 1.8 Who Dumby Is For

```
TABLE 1-B — Audience → Fit

┌─────────────────────┬───────────────────────────────────────────────────┐
│ Audience │ Why Dumby's shape fits them │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Platform teams │ Running across hundreds to tens of thousands of │
│ │ guilds; need per-guild toggles, predictable │
│ │ scaling, and a boundary letting many engineers │
│ │ ship in parallel without collisions. │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Module authors │ Internal or third-party; want to build one │
│ (internal/third-party) │ well-scoped feature without learning every other │
│ │ module already loaded. │
├─────────────────────┼───────────────────────────────────────────────────┤
│ Single-server │ Start with a handful of Standard modules and grow │
│ operators │ into a fully-loaded deployment without ever │
│ │ hitting an architectural wall that forces a │
│ │ rewrite. │
└─────────────────────┴───────────────────────────────────────────────────┘
```

Each audience has a different honest reading path, and conflating them is a common
source of disappointment:

- The **platform team** is the intended reader of the reference production process — the
  two-approver release gate (§43.4), the on-call rotation, and the Kubernetes /
  multi-region deployment tier (§44.6). It can assume those exist.
- The **single-server operator's** honest start is the smallest deployment tier in §44.6:
  one process, one database, no active/standby failover. It should read Parts I–IV and
  may skip the two-approver gate and on-call assumptions entirely.
- The **module author** needs mainly §11 (the manifest and module anatomy), §12 (a
  worked example), and §17–§21 (commands, events, middleware, permissions) — and can
  treat the rest as reference.

### 1.9 How To Verify This Section Against the Code

A definition is worth only what a reader can check. This section's claims map onto the
repository as follows:

- "single TypeScript application runtime" → `apps/main/package.json` (`type: module`,
  `engines.node >= 22`), one `src/bootstrap/bootstrap.ts` entrypoint.
- "modules are the exclusive source of behaviour" → `apps/main/src/` contains no
  feature-command directory; every command lives in a `packages/modules/*` package.
- "the framework does not special-case itself" → the eight first-party modules in
  `packages/modules/` carry ordinary manifests and no privileged import surface.
- "one permission engine" → `apps/main/src/permissions/resolver.ts`, a single 7-layer
  resolver consumed by every dispatch.

Where a claim here and the code disagree, the disagreement is recorded in
`status/code-reconciliation.json`; this reference does not silently diverge from the
tree it describes.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-FOUND-0001-1
  check: "No framework-only code path exists: every first-party behaviour (incl. admin) is a module on the manifest contract"
  test: tests/arch/no-self-special-casing.spec.ts
- id: ACC-FOUND-0001-2
  check: "The seven design pillars hold (module sovereignty, contract over convention, fail-fast/degrade, observability, one surface, TS as design material, progressive disclosure)"
  test: tests/arch/design-pillars.spec.ts
```

## Edges (-> blueprint)
- SPEC-01-FOUNDATIONS-0001#LOAD_BEARING_IDEA -> SPEC-02-ARCHITECTURE (one DI container, one event bus, one permission engine)
- SPEC-01-FOUNDATIONS-0001#PILLARS -> SPEC-03-MODULES (Module Sovereignty defines the module contract)
- SPEC-01-FOUNDATIONS-0001#PILLARS -> SPEC/00-GOVERNANCE (One Operational Surface; ban registry)
