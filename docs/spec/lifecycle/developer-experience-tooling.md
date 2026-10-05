---
id: SPEC-07-LIFECYCLE-0038
title: 38. Developer Experience & Tooling
kind: spec
status: normative
version: 5.0.0
authority_scope: [07-lifecycle]
anchors: [DEVELOPER_EXPERIENCE_TOOLING, SCAFFOLDING_CLI, IDE_CONFIGURATION_SNIPPETS, DEV_MODE_DIAGNOSTICS, CUSTOM_ESLINT_RULES, DESIGN_CONSIDERATION_ESM_LOADER, VERIFICATION_STATUS_ARCHITECTURE_S, DOCUMENTATION_AUTO_GENERATION, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-LIFE-0038-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 38. Developer Experience & Tooling

**Status:** [SPEC]

### 38.1 The Scaffolding CLI

`pnpm dumby scaffold module <name>` is developer convenience, not core functionality — it
generates a manifest-valid skeleton matching the author's selected structural components, a
stub migration, and a stub locale file. The framework behaves identically whether a module was
scaffolded or hand-authored; the CLI confers no capability a hand-written module lacks.

### 38.2 IDE Configuration & Snippets

The committed editor configuration ships a tsx-based debugger config (no separate
compiled-output step), editor settings matching the Prettier and ESLint config exactly, and a
snippet library for the most repetitive patterns.

### 38.3 Dev-Mode Diagnostics

A development environment enables extra diagnostics: trace-level logging by default rather than
info, a verbose DI container resolution log, and relaxed rate limits.

### 38.4 Architecture-Specific ESLint Rules

Because uploaded JavaScript bypasses ESLint entirely, the compile-time rules on source are
complemented by a post-build static scan of compiled output and by runtime module resolution
through the ESM loader. Error detection is shifted left from runtime to upload time: the build
pipeline runs the type checker, these lint rules, and manifest validation during module upload.

```
TABLE 38-A — Architecture-specific lint rules

no-cross-module-relative-import   the foundational module isolation guarantee
no-direct-process-env             any process.env access outside a module's own declared
                                  config schema — config must be validated, never read ad hoc
no-embed-builder                  any import/use of EmbedBuilder or MessageEmbed in module
                                  source — the classic-embed ban's lint layer; payload
                                  construction belongs to the core renderer alone
no-repository-in-command          a command file importing a repository class directly,
                                  bypassing the service layer
no-event-emit-in-repository       a repository method emitting an event — business-event
                                  decisions belong to the service layer
require-eventsCatalog-entry       an emit whose name is absent from the emitting module's own
                                  catalogue
zero-trust-build-pipeline         a module upload that bypasses the manifest-validation and
                                  build pipeline
```

These rules bind the TypeScript source under review; they do not by themselves establish that
an uploaded artifact was compiled from that source. Artifact provenance is closed only by a
trusted builder producing signed build attestations — until that lands, provenance of uploaded
artifacts is explicitly not guaranteed. A project-wide rule forbidding direct interaction-reply
calls outside the core would mechanically enforce the renderer-only authoring contract at
authoring time.

**Enforcement verification.** CI requires all the rules above to be active in the flat ESLint
config, with failure on violation and ESLint run as a hard gate rather than warning-only.
Dependency hygiene is enforced too: an unused-dependency check runs in CI and fails the build
when an unused dependency, unused export, or unresolved file lingers.

### 38.5 Documentation Auto-Generation

A dedicated build step reads every loaded module's manifest — its description, event catalogue,
dashboard schema, and command descriptions — and generates a browsable reference site. This is
what keeps the claim "the event catalogue is, in effect, the API documentation" true: generated
docs and the runtime contract agree because both read from the identical manifest source. The
drift risk is real — a developer who updates a command implementation but forgets the
manifest's command list gets stale docs — so a CI check verifying manifest commands match the
actual class implementations is required.

### 38.6 How To Verify This Section Against the Code

- The flat ESLint config: `apps/main/eslint.config.mjs`.
- The editor configuration: `apps/main/.vscode/`.
- The module lint config: `packages/modules/eslint.config.mjs`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-LIFE-0038-1
  check: "The scaffold CLI generates a manifest-valid module; ESLint boundary rules block cross-module imports and direct Redis/DB access"
  test: tests/ci/lint-boundaries.spec.ts
```

## Edges (-> blueprint)
- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)

## Named entities

**classes, interfaces & symbols:** `CI-enforced`, `Reinforces`, `loadModulesFromSwastikVolume`

**events & identifiers:** `CommonJS.`
