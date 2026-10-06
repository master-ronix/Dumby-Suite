---
id: SPEC-ORIENTATION-DEFINITIONS
title: The Nine Documents — Intent, Impact, Purpose & Definition
kind: spec
status: normative
version: 5.0.0
authority_scope: [orientation]
contracts: []
acceptance: [ACC-ORI-DEF-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## The Nine Documents — Intent, Impact, Purpose & Definition

Dumby Documentation — Intent, Impact, Purpose & Definition. For each canonical document the
index gives its **definition**, **intent**, **impact**, and **purpose**, so a reader knows not
only what a document contains but why it exists and what it is authoritative for.

**Corpus composition (defined once).** The corpus comprises **nine canonical documents** —
`blueprint.md`, `directive.md`, `documentation.md` (the archived legacy record), `interface.md`,
`directory.md`, `concept.md`, `change-log.md`, `definitions.md` (this index), and
`master-prompt.md` — together with the `adr/` decision series and the `ur/` frozen request
records. The consolidated re-baseline request's "twelve-document" figure enumerates its own
target rows: the eight canonical documents it edits (all but this index), the `adr/` series,
and the three `ur/` records — twelve in total. Where "nine" and "twelve" appear elsewhere, they
resolve to this definition.

### 1. blueprint.md
**Definition.** A standalone developer-facing engineering reference — one coherent application
outside, N independently-owned modules inside, with a hard tooling-enforced wall between
"coherent" and "monolithic"; specifies architecture, behavior, and contracts to a behavioral
level without shipping compiled source. **Intent.** A single document explaining every part of
the system — the load-bearing philosophy, the fourteen engineering principles, the
module-manifest field reference, the eighteen-stage bootstrap sequence, the seven-layer
permission engine, the Swastik hot-reload pipeline, the caching architecture, CI/CD, and
operational runbooks — so any qualified reader can build against, operate, or evaluate the
architecture without a second source. **Impact.** The complete technical contract in one place —
9 Parts, 48 sections, plus appendices. **Purpose.** The authoritative engineering reference.

### 2. change-log.md
**Definition.** A unified, evidence-verified change log of the complete documentation lineage —
thirteen archive drafts from v1.0.0 through FINAL, the living reference pair from v4.5.1, and
(from 2026-09-18) the full v5.0.0 set — cross-checked against independent evidence. **Intent.**
Reconstruct one trustworthy narrative of the spec's evolution, correcting mislabeled filenames
and self-declared headers against content evidence. **Impact.** A master version table, a
version-by-version changelog, a cross-version defect-lifecycle table, and honest accounting of
unresolved open items. **Purpose.** The definitive historical record.

### 3. concept.md
**Definition.** The foundational concept/philosophy document (why Dumby exists, its beliefs,
who it serves, its positioning) and, since v5.0.0, the set's glossary of program terms and RBAC
vocabulary. **Intent.** Articulate the core problem and the structural answer — a modular bot
suite where each module is independently owned, unified under a single bot identity. **Impact.**
Establishes the ideological foundation: the Dumby Triad, depth over breadth, specialization
aligned with incentive, governed quality. **Purpose.** So anyone evaluating, building, or
operating Dumby understands not just what it does but why.

### 4. directive.md
**Definition.** A prescriptive engineering directive mandating the backend, architecture, and
infrastructure development rules for the core — stated as binding rules (MUST, MUST NOT, SHALL),
across 8 parts with rule-numbered sections and two traceability appendices. **Intent.** Define
exactly what is permitted, required, and forbidden — from the prime directive through the ban
registry, technology-stack mandates, and system-architecture directives, each as an enforceable
rule with explicit scope, exclusions, and a definition of "done." **Impact.** A governance
instrument declaring what the core is and is not, the precedence order, and a substitution
policy. **Purpose.** A single authoritative rulebook removing ambiguity about what the core
must do and how compliance is verified.

### 5. directory.md
**Definition.** A complete file/folder tree of the canonical project structure for the monorepo,
top level down to subsystem folders, with repository governance at the root and annotations for
each folder's role. **Intent.** A single unambiguous reference for where everything lives.
**Impact.** The structural map of the repo; since v5.0.0 it also documents the runtime module
topology — feature modules no longer in-tree but on the four per-tier volumes plus
`swastik-staging`. **Purpose.** So every contributor, tool, and automation script works from the
same canonical understanding of layout.

### 6. documentation.md
**Definition.** The archived legacy architecture/lifecycle/operations reference (version 4.5.1
lineage; set version 5.0.0 archived) — the frozen record of the decisions the current blueprint
inherits, with superseded-decision markers pointing at their successors. **Intent.** Preserve
without rewriting the historical record of how the spec read at v4.5.1. **Impact.** Its
superseded-decision markers resolve previously live contradictions at their source. **Purpose.**
The trustworthy historical witness — consulted for inherited decisions and provenance, never for
current behavior.

### 7. interface.md
**Definition.** The complete end-user interface specification for Dumby's Discord-facing
surfaces — every page of the Core Command Surface, under the single presentation authority of
the core Renderer. **Intent.** Define with zero ambiguity everything a user can encounter — the
Renderer's static Components v2 grammar, dynamic slots, the three density modes, the
buffer-then-render lifecycle, the edit-in-place invariant, formal notice frames with reason
codes and trace ids, and interactive-component behavior. **Impact.** Specifies the official
accent colour and the title/attribution grammar as the one grammar for every surface; bans
classic embeds. **Purpose.** The definitive contract-level description of what the user sees.

### 8. master-prompt.md
**Definition.** A complete execution brief for constructing the Dumby system — a structured
build prompt taking an implementer from an empty workspace or any partially-complete codebase to
a verified, deployable application. **Intent.** Give the builder everything to execute the
construction in one self-contained orchestration document (zero content copied from the source
documents; every specification loaded on demand). **Impact.** Defines a phase-gated build plan
and resolves known cross-document conflicts explicitly. **Purpose.** Transform the specification
from a reference into an actionable construction plan.

### 9. adr/ — The Decision-Record Series
**Definition.** The numbered ADR series (ADR-001 through ADR-011) recording the eleven
cross-cutting design tensions the v5.0 program settled. **Intent.** Give every load-bearing
design reversal a permanent citable home (context, decision, consequences). **Impact.** Each
record cites its governing sections and the documents its decision binds. **Purpose.** Keep the
suite's hardest judgment calls explicit, dated, and traceable.

### 10. ur/ — The Frozen Request Records
**Definition.** The register of the authoritative request records of the v5.0 program: the
consolidated re-baseline request (UR-20260918-001) and the three frozen source records it
consolidates. **Intent.** Hold the provenance of the re-baseline in one place. **Impact.** Makes
the traceability chain inspectable end-to-end: request → ADR → document sections → change-log
entries. **Purpose.** So no one edits history to win an argument — changes to the program are new
request records, never edits to frozen ones.

## Acceptance
```acceptance
- id: ACC-ORI-DEF-1
  check: "Every canonical document has a definition/intent/impact/purpose entry"
  test: tests/docs/definitions-index.spec.ts
```

## Named entities

**files & artifacts:** `workspace/docs/`

