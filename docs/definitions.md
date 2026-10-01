# Dumby Documentation — Intent, Impact, Purpose & Definition

**Document Set:** Dumby v5.0.0 — Consolidated Re-Baseline Edition · nine canonical documents · `docs/adr/` decision series · `docs/ur/` frozen request records

> **Corpus composition (defined once).** The documentation corpus comprises **nine canonical documents** — `blueprint.md`, `directive.md`, `documentation.md` (archived legacy record), `interface.md`, `directory.md`, `concept.md`, `change-log.md`, `definitions.md` (this index), and `master-prompt.md` — together with the `docs/adr/` decision series and the `docs/ur/` frozen request records. The consolidated re-baseline request's "twelve-document" figure enumerates its own target rows: the eight canonical documents it edits (all but this index), the `docs/adr/` series, and the three `docs/ur/` records — twelve in total. Where "nine" and "twelve" appear elsewhere in the corpus, they resolve to this definition.

---

## 1. blueprint.md

**Definition.** A standalone, developer-facing engineering reference for the Dumby framework — a Discord bot architecture built around a single governing idea: one coherent application from the outside, N independently-owned modules from the inside, with a hard, tooling-enforced wall between "coherent" and "monolithic." It specifies architecture, behavior, and contracts to the level of what each mechanism must do and how it must behave, without shipping compiled source code.

**Intent.** To give framework maintainers, module authors, platform/SRE operators, and engineering leads a single document that explains every part of the system — from the load-bearing philosophy and fourteen engineering principles down to the exact field reference for a module manifest, the eighteen-stage bootstrap sequence, the seven-layer permission engine, the Swastik hot-reload pipeline, the caching architecture, the CI/CD workflow, and operational runbooks — so that any qualified reader can understand, build against, operate, or evaluate the architecture without needing a second source.

**Impact.** Establishes the system's complete technical contract in one place: 9 Parts, 48 sections, and appendices covering foundations and philosophy, core architecture, the module system, the request and interaction layer, data and state, reliability/security/operations, the module catalog, the engineering lifecycle, and a reference section with a mandatory feature compliance matrix generated from the Compatibility Ledger. The 5.0.0 Consolidated Re-Baseline integrates the core Renderer and buffer-embed presentation model, the RBAC Layer 6/7 redesign, the four per-tier module volumes, the six-state license machine, the Compatibility Ledger, Global Data Emit, the Twixter persona model, and envelope encryption, and restates the audit register honestly against the Phase 0–4 rollout. It is structured so that every mechanism is specified to a behavioral level — meaning a team could implement the system from this document alone — while explicitly stating non-goals and boundaries to prevent scope creep.

**Purpose.** To serve as the authoritative engineering reference that defines what the framework is, how every layer behaves, what contracts each component must honor, and what the system deliberately refuses to be — ensuring that anyone touching the codebase works from the same complete, unambiguous picture rather than tribal knowledge.

---

## 2. change-log.md

**Definition.** A unified, evidence-verified change log covering the complete revision history of the Dumby documentation lineage — thirteen archive drafts from v1.0.0 through FINAL, the living reference pair from v4.5.1, and, from 2026-09-18, the full v5.0.0 document set — cross-checked against independent evidence sources: the project's own production changelog, seven external audits, eight upgrade directives, direct full-file diffs run version-to-version, and, for v5.0.0, the consolidated program request and a cross-document consistency sweep.

**Intent.** To reconstruct a single, trustworthy narrative of how the specification evolved across every version, correcting mislabeled filenames and self-declared headers against content evidence, and ensuring that no claim about what changed rests on only one source. It tracks not just what was added or removed in each version, but how specific defects were introduced, flagged, partially addressed, and finally resolved — sometimes across four or five versions.

**Impact.** Provides a master version table with one-line themes; a version-by-version changelog with diff-verified additions, fixes, changes, and known defects for each release; a cross-version defect lifecycle table tracking defects end-to-end from introduction to resolution; and an honest accounting of open items that remain unresolved. The v5.0.0 entry records the consolidated re-baseline per document (twelve rows including the `docs/adr/` series and the three frozen `docs/ur/` source records), the shared-fact changes (renames, the single normative permission ordering, the superseded 4.5.1 decisions), and the adopted per-request record discipline — every subsequent program-keyed documentation change records its own change-log line citing its request ID.

**Purpose.** To serve as the definitive historical record of the documentation's evolution — giving any current or future contributor a complete, verified account of what changed, when, why, and whether it was actually fixed, so that no one has to reconstruct the history from scattered drafts or trust self-reported claims without independent verification.

---

## 3. concept.md

**Definition.** A foundational concept and philosophy document that explains why Dumby exists, what beliefs shape its design, who it serves, and how it positions itself against alternatives in the Discord bot ecosystem — and, since v5.0.0, the set's glossary of program terms and RBAC vocabulary.

**Intent.** To articulate the core problem — that no single team can give equal, excellent attention to dozens of unrelated features simultaneously — and to lay out the structural answer: a closed-source, modular bot suite where each module is independently owned by a confirmed developer whose entire responsibility is that one module, unified under a single bot identity so the operator never feels the seams. It defines the Dumby Triad (Modular for members, Unified for operators, System for developers) as the three-faced experience model, and explains how governance on the developer side enables simplicity on the operator side, which enables genuine quality on the member side.

**Impact.** Establishes the ideological foundation: depth over breadth as a structural guarantee, specialization aligned with incentive, unified presence despite distributed ownership, governed quality over open chaos, and reliability as an entitlement rather than an upsell. Its §16 glossary defines the eighteen v5.0 program terms (Renderer, buffer embed, formal notice frame, Modes D/M/C, edit-in-place navigation, Core Command Surface, the `swastik` package, Global Data Emit, Twixter, Release Manager, license state machine, tier volumes, Compatibility Ledger, trusted builder, visibility, hardcoded module, Deployment Record, envelope encryption) and the RBAC vocabulary (Layer 6, Layer 7, the six-rank ladder with canonical MODERATOR/ADMINISTRATOR naming, grant scopes, the RESTRICTED floor, and the override boundary), resolving the formerly conflicting "Set" and "OWNER" definitions once for the whole set.

**Purpose.** To ensure that anyone evaluating, building, or operating Dumby understands not just what it does but why it was designed that way — so that every technical and product decision downstream has a clear philosophical anchor to test against.

---

## 4. directive.md

**Definition.** A prescriptive engineering directive that mandates the backend, architecture, and infrastructure development rules for the Dumby application core — stated as binding rules (MUST, MUST NOT, SHALL), not descriptive explanations, across 8 parts with rule-numbered sections and two traceability appendices.

**Intent.** To define exactly what is permitted, required, and forbidden in the core's construction and operation — from the prime directive (the core must remain a single, unified application that is internally modular but never a monolith) through the ban registry (prefix-command simulation, classic embeds, unsolicited DMs — each with its enforcement layers and migration windows), technology stack mandates, system architecture directives, request and event processing engine directives, data and state directives, reliability/security/operations directives, and engineering lifecycle directives — each stated as an enforceable rule with explicit scope, exclusions, and a definition of "done."

**Impact.** Creates a governance instrument: it declares what the core is and is not, what falls inside and outside its scope, the precedence order when rules conflict, and a substitution policy for when a mandated technology must be replaced. The 5.0.0 edition adds the sole-logger rule (Pino with ESLint `no-console`), CI hygiene directives (SHA-pinned actions, secrets off command lines, Dependabot, workflow checks), the enforced eventsCatalog contract, the environment-key policy, the Compatibility Ledger release gate, and the standing greenfield-exclusion rule recording the 52 deferred items as out of scope. Appendix A traces every directive to its blueprint.md 5.0.0 authority; Appendix B is the compliance self-audit checklist.

**Purpose.** To give engineers a single, authoritative rulebook that removes ambiguity about what the core must do, must not do, and how compliance is verified — so that every contribution can be measured against a fixed standard rather than against interpretation or preference.

---

## 5. directory.md

**Definition.** A complete file and folder tree representing the canonical project structure for the Dumby-Suite monorepo, showing every directory from the top level down to individual subsystem folders — with the repository governance (`.github/`, Dependabot, CODEOWNERS) at the repository root and annotations describing each folder's role.

**Intent.** To provide a single, unambiguous reference for where every part of the project lives — the application core under `apps/main/src/core/`, the unified command system at `src/commands/`, shared utilities (including the `safeJoin`/`assertPathInside` containment guard) at `src/shared/`, process entrypoints (including the CLAI SSH server and the truncated worker bootstrap) at `src/entry/`, the `packages/swastik` authoring workspace, the Release Manager tooling, the root-level CI hygiene scripts, the documentation set with `docs/adr/` and `docs/ur/`, the test hierarchy, and the supporting project areas.

**Impact.** Serves as the structural map of the entire repository — a reader can determine at a glance which subsystem a given file belongs to, where tests for a particular layer live, and how the reserved monetization scaffold is organized relative to the rest of the core. Since v5.0.0 it also documents the runtime module topology: feature modules no longer live in-tree but on the four per-tier volumes (`modules-admin`, `modules-core`, `modules-standard`, `modules-marketplace`) plus `swastik-staging`, with tier-at-rest enforcement, promotion-based seeding, and blind discovery at bootstrap.

**Purpose.** To ensure that every contributor, tool, and automation script works from the same canonical understanding of where things go — eliminating guesswork about project layout and making the repository's structure self-documenting.

---

## 6. documentation.md

**Definition.** The archived legacy architecture, lifecycle, and operations reference for Dumby (version 4.5.1 lineage; set version 5.0.0 archived) — retained as the frozen record of the decisions the current blueprint inherits, with superseded-decision markers pointing at their blueprint.md 5.0.0 successors and a frozen table of contents.

**Intent.** To preserve, without rewriting, the historical record of how the specification read at v4.5.1 — its Rosetta Stone conceptual map, its fifty-one sections, and its self-verification report — so that the decisions, reasoning, and vocabulary the current engineering reference evolved from remain inspectable, while the archival banner and superseded markers prevent any reader from mistaking it for the current specification.

**Impact.** Its superseded-decision markers resolve the previously live contradictions at their source: the SDUI scope decision is marked superseded by the embed ban (blueprint.md 5.0.0 §4, ADR-001), the three-tier marketplace visibility by the manifest `visibility` enum (§11.2), the legacy permission-layer ordering by the single normative seven-layer ordering with Layers 6 and 7 (§21), and the legacy MDIS endpoint record by the versioned OpenAPI families (§44). The table of contents is frozen and must not be extended.

**Purpose.** To serve as the trustworthy historical witness of the specification's evolution — consulted for inherited decisions and provenance, never for current behavior; blueprint.md 5.0.0 is the sole current engineering authority.

---

## 7. interface.md

**Definition.** The complete end-user interface specification for Dumby's Discord-facing surfaces — every page of the Core Command Surface (`/dashboard`, `/health`, `/browse`, `/queue`, `/persona`, `/permit`, `/modules`, plus the `/hello` reference module), defined under the single presentation authority of the core Renderer.

**Intent.** To define, with zero ambiguity and zero omission, everything a user can encounter when interacting with the bot — the Renderer's static Components v2 grammar (frames, dividers, title/subtitle, footer) with its dynamic slots (accent, banner, module identity, content), the three density modes D/M/C, the buffer-then-render interaction lifecycle, the edit-in-place navigation invariant, the formal notice frames with their reason codes and trace correlation IDs, and the interactive-component behavior (minted customIds, invoker re-check, idempotency, the 800 ms autocomplete budget, the 13-minute follow-up watchdog).

**Impact.** Specifies the official accent colour (blurple `#5865F2`, single and non-configurable) and the A4 title/attribution grammar as the one grammar for every surface; bans classic embed construction in favor of renderer-issued Components v2; defines the Twixter persona surface (bring-your-own-identity, one persona = one server, creation via the Twixter registration API) and the `/permit` interactive flows in the Layer 6/7 vocabulary; and provides the mode rendering matrix and reason-code index as cross-cutting reference tables. Module authors declare command schemas; the Renderer derives presentation, components, and flows.

**Purpose.** To serve as the definitive, contract-level description of what the user sees — so that any change to any surface, or the addition of any new end-user-facing interface, is a documented, version-controlled event rather than an undocumented drift from the stated surface.

---

## 8. master-prompt.md

**Definition.** A complete execution brief for constructing the Dumby system — a structured build prompt (version 5.0.0) that takes an implementer from an empty workspace or any partially-complete codebase to a verified, deployable application, organized as a phased build plan, engineering guardrails, a quality bar, and a final acceptance checklist.

**Intent.** To give the builder everything needed to execute the construction in one self-contained orchestration document (zero content copied from the source documents; every specification loaded on demand from `workspace/docs/`): the mission and scope, the detection/remediation/enforcement architecture for existing codebases, the phased build plan, and the completion definition — now including the buffer-then-render presentation contract, the A4 title grammar, the single blurple accent token, the embed ban, the DM prohibition, and the tier-volume module topology.

**Impact.** Defines a phase-gated build plan so the construction proceeds in a verified, incremental order rather than as a single undifferentiated build. It resolves known cross-document conflicts explicitly, declares source authority and precedence (blueprint.md 5.0.0 as sole architectural authority, the `docs/adr/` series as the settled record for the eleven design tensions, `docs/ur/` as frozen provenance), provides an environment-variable quick reference and an error taxonomy, and closes with a final acceptance checklist that the completed build must pass.

**Purpose.** To transform the specification from a reference document into an actionable construction plan — so that an implementer knows not just what the system is, but exactly what to build, in what order, against what standard, and how to verify that the result is correct.

---

## 9. docs/adr/ — The Decision-Record Series

**Definition.** The numbered architecture-decision-record series (ADR-001 through ADR-011, series version 1.0) recording the eleven cross-cutting design tensions the v5.0 program settled: the classic-embed ban, the complete DM prohibition, envelope-encryption scope, the fifth cross-module pattern, tier volumes, the reload-automation boundary, detection honesty, the Twixter free-charter sunset, the title/attribution grammar, the official accent colour, and the persona-creation surface.

**Intent.** To give every load-bearing design reversal a permanent, citable home — context, decision, and consequences — so that no future implementer re-litigates a settled tension or silently reverses it; ADR-005 in particular supersedes the legacy flat-layout decision previously recorded only in blueprint prose.

**Impact.** Each record cites its governing blueprint.md 5.0.0 sections and the documents its decision binds; the series resolves the accent colour (blurple `#5865F2`) and title grammar (A4) by the program's standing constraint that renderer/grammar decisions adopt A4 where the two source documents conflict.

**Purpose.** To keep the documentation suite's hardest judgment calls explicit, dated, and traceable — the difference between a decision and an accident.

---

## 10. docs/ur/ — The Frozen Request Records

**Definition.** The register of the authoritative request records of the v5.0 program: the consolidated re-baseline request (UR-20260918-001 — 121 requests: 31 program URs, 88 implementation-flaw corrections, 2 RBAC redesign requirements), and the three frozen source records it consolidates (5.0-UR-1, the v5.0 upgrade program; the Suite implementation-flaw request verified at commit `be39a52`; and the RBAC flaws-and-requirements record at 1.0).

**Intent.** To hold the provenance of the re-baseline in one place: each record's identity, version, freeze status, and scope, with the register — not copies — as the entry point, since the records are frozen program archives whose content is authoritative for the requests they define.

**Impact.** Makes the traceability chain inspectable end-to-end: request → ADR where applicable → document sections → change-log entries. The register also carries the standing constraint that the Suite record's line-number references were verified at `be39a52` and must be re-verified against working HEAD, and the one question the sources leave open (guild vs module-author sovereignty over a command's Discord-bit gate), carried openly in blueprint.md §21.

**Purpose.** To ensure no one edits history to win an argument — changes to the program are new request records, never edits to frozen ones.
