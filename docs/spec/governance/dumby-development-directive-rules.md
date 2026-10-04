---
id: SPEC-00-GOVERNANCE-0001
title: DUMBY — Development Directive Rules
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0001-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# DUMBY — Development Directive Rules

## Normative Engineering Rules for the Application Core & Control-Plane Services

**Document type:** Development Directive — rules and guide (not a prompt, not an enforcement mechanism)
**Project:** Dumby — Discord Unified Modular Bot System
**Directive version:** 5.0.0
**Derived from:** the blueprint 5.0.0 — Consolidated Re-Baseline Edition (sole architectural authority)
**Applicability:** Application Core, module-system framework (the engine, not module authorship), request/interaction/data backend, control-plane services, infrastructure, and engineering lifecycle
**Explicitly excluded from scope:** frontend and end-user interface surfaces (Discord Components V2 embed layouts, dashboard navigation, banners, cosmetic specification — governed by `spec/request-layer/`), module-authoring guidance, worked module examples, and the illustrative module catalog
**Governing objective:** Following this directive end-to-end MUST yield a finished, deployable, ready-to-use Dumby bot — a runtime that boots clean, serves traffic, degrades safely, observes itself, and passes its own acceptance gate (Part 8, Definition of Done)

---

## TABLE OF CONTENTS

- [Directive Charter — How to Use This Document](#directive-charter--how-to-use-this-document)
- [PART 1 — Foundations & Doctrine](#part-1--foundations--doctrine)
- [PART 2 — Technology Stack & Runtime Boundaries](#part-2--technology-stack--runtime-boundaries)
- [PART 3 — Application Core — Bootstrap, Lifecycle & DI](#part-3--application-core--bootstrap-lifecycle--di)
- [PART 4 — Module System Framework](#part-4--module-system-framework)
- [PART 5 — Request, Permission & Data Architecture](#part-5--request-permission--data-architecture)
- [PART 6 — Control-Plane Services](#part-6--control-plane-services)
- [PART 7 — Reliability, Security & Performance](#part-7--reliability-security--performance)
- [PART 8 — Quality, Delivery & Acceptance](#part-8--quality-delivery--acceptance)
- [Appendix A — Directive-to-Blueprint Traceability](#appendix-a--directive-to-blueprint-traceability)
- [Appendix B — Compliance Self-Audit Checklist](#appendix-b--compliance-self-audit-checklist)
- [Appendix C — Logged Deviations (True Unknowns With No Owning Row)](#appendix-c--logged-deviations-true-unknowns-with-no-owning-row)

---

## Acceptance
```acceptance
- id: ACC-GOV-0001-1
  check: "Directive rules are normative (MUST/SHALL) and subordinate to blueprint; precedence order is documented"
  test: tests/docs/governance-charter.spec.ts
```
