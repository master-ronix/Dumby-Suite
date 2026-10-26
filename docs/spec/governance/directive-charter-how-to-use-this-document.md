---
id: SPEC-00-GOVERNANCE-0002
title: DIRECTIVE CHARTER — HOW TO USE THIS DOCUMENT
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0002-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# DIRECTIVE CHARTER — HOW TO USE THIS DOCUMENT

### 0.1 Nature and Authority

This is the imperative rule set that translates the Dumby architecture into
actionable engineering gates. It is **authoritative but non-enforcing**: the
document commands nothing by itself. Where a rule can be enforced, enforcement
belongs to tooling — the `tsc` gate, the architecture-specific ESLint rules, the
per-layer Vitest coverage thresholds, and the CI pipeline (Part 8) — never to
this text. A rule that current tooling cannot check remains a standing review
obligation until tooling catches up, and SHOULD be promoted into tooling the
moment it becomes feasible.

This directive is **derived from and subordinate to** `blueprint.md`. It adds no
architecture, invents no requirements, and overrides nothing. Where this
directive and the blueprint appear to conflict, the blueprint wins, and the
conflict MUST be recorded in `change-log.md` and fixed here in the next
directive revision.

### 0.2 Precedence Order

The canonical document-precedence order for the whole set. When any two documents appear to conflict, the higher-precedence document wins; the conflict MUST be recorded in `change-log.md` and resolved in favour of the higher-precedence reading. **This list is the single normative statement of precedence for the corpus — every other document cites it rather than restating it.**

````
1. blueprint.md (v5.0.0)            — sole source of architectural truth
2. directive.md (v5.0.0)            — imperative translation of #1 into binding rules
3. documentation.md (v5.0.0, archived) — frozen legacy record, retained for the decisions the set inherits
4. interface.md (v5.0.0)            — the end-user interface specification
5. directory.md (v5.0.0)            — the canonical layout reference
6. concept.md (v5.0.0)              — ideological foundation and glossary
7. change-log.md                    — version history and defect lifecycle
8. definitions.md                   — document intent and scope definitions
9. master-prompt.md (v5.0.0)        — the build execution brief, derived from all preceding documents
````

> **Restructure note (v5.0.0 corpus).** The nine documents above are the pre-restructure v5.0 source records. They are preserved verbatim under `_inbox/` and distributed across the restructured corpus (`blueprint/`, `documentation/`, `spec/`); where this list names a source document, read it as the distributed section(s) it became. The ADR series and the other decision records cite these source names in the same historical sense.

### The authority order across three sources

The corpus, the shipped code and the decision records are three descriptions of one system, and they
drift. This is the single statement of which one wins, and what a reader does when they disagree:

```
1. The specification (spec/, blueprint/, contracts/)  — governs REQUIRED behaviour.
2. The shipped code                                   — governs what is ACTUALLY implemented.
3. The decision records (adr/, upgradation/)          — evidence of a DECISION, never an authority.
```

- **The specification governs required behaviour.** Where the code and the specification differ, the
  divergence is a **code-gap**: it is recorded in `status/code-reconciliation.json` with the `code_ref`
  that holds the behaviour, and it is never smoothed over in prose. A specification statement is not
  softened to match the code, and the code is not silently assumed correct.
- **The code governs what is actually implemented.** A claim about current behaviour is answered from
  the tree, not from the specification's intent. When they disagree the reader has learned something
  worth recording, not a licence to pick the convenient one.
- **A decision record is never an authority over behaviour.** It explains *why* a choice was made. Its
  normative content belongs in the specification; when a record and the specification disagree, the
  record is the stale copy and the specification is the target — unless the record is later than the
  specification and states a decision the specification has not yet absorbed, in which case absorbing
  it is the work, not citing it.

A record that has been absorbed changes nothing by being deleted; a record that has not been absorbed is
the only place a decision survives, which is why absorption precedes retirement.

### 0.3 Requirement Language (RFC 2119)

- **MUST / MUST NOT** — an absolute requirement. Violating it is a defect, full stop. If tooling can detect it, tooling MUST detect it; if it cannot yet, review MUST.
- **SHOULD / SHOULD NOT** — a strong default. Deviating requires a recorded justification (an ADR, or a note in the change log), not a silent choice.
- **MAY** — a genuinely optional behavior, offered where the blueprint allows operator or deployment latitude.

### 0.4 Directive Grammar

Every rule carries an identifier `D-<part>.<rule>`, a statement in RFC 2119
language, a rationale where the "why" is not self-evident, and a verification
line naming the mechanism that checks it (CI gate, ESLint rule, boot-time
validation, review checklist, or runtime behavior). Citations to the blueprint
use its section numbers (e.g., "§8.2" = the 18-stage bootstrap).

### 0.5 Scope and Exclusions — Stated Precisely

In scope: everything the blueprint specifies for the framework, its backend, and
its infrastructure — the runtime and language, the Application Core, the
module-system engine, request routing and permissions, data and state, the
control-plane services (Swastik, Power Engine Panel, CLAI, Credentials,
Release Manager),
observability, security, performance, testing, CI/CD, infrastructure, and
versioning.

Out of scope, without exception:

````
✗  Frontend / end-user interface: Discord embed layouts, Components V2
   presentation, banners, dropdown navigation, dashboards as experienced
   by the end user (interface.md owns these).
✗  Module-authoring guidance: how to write a module, worked examples,
   and the illustrative module catalog. This directive governs the engine
   that loads modules, never the modules themselves.
✗  Any rule whose only purpose is the appearance of a command rather
   than its routing, permission, data, or lifecycle behavior.
````

Where a backend rule necessarily touches the boundary (e.g., "the command
router MUST dispatch through the middleware pipeline"), the rule governs the
router, not the response's visual shape.

**Deferred greenfield work — a standing exclusion (MUST NOT).** The
following subsystems are deferred greenfield work with no shipped
implementation. They are the 52 deferred greenfield items, tracked in the
suite exclusions appendices for future programs:

````
✗  trusted-builder Phase-1 build subsystem
✗  Ed25519 signing subsystem
✗  heap-diff memory watcher
✗  Core UI Compiler / static embed system
✗  Dodo Payments integration
✗  full independent-persona system
✗  marketplace multi-state licensing
✗  GitHub release integration buildout
✗  Release Manager 12-phase service
✗  defineManifest package
✗  event-bus advanced semantics
✗  break-glass script
✗  worker_threads isolation
````

They are explicitly out of scope and MUST NOT be smuggled into correction
work: a flaw-fix or correction request, or review feedback, that quietly
widens scope to build one of these is itself a defect. Where this directive
or the blueprint references a capability on this list, the reference is a
declared future-state obligation — it MUST NOT be represented as shipped
capability, and the spec-vs-implementation gap stays visible under the
honesty rule (D-1.6) until a future program delivers it.

### 0.6 Change Management

Every revision of this directive MUST be recorded in `change-log.md`, in the
same lineage discipline the living reference pair already uses. A directive
rule that is added, weakened, or retired without a change-log entry is
defective by definition.

---

## Acceptance
```acceptance
- id: ACC-GOV-0002-1
  check: "The charter defines authority, precedence, RFC-2119 language, and scope/exclusions"
  test: tests/docs/governance-charter.spec.ts
```
