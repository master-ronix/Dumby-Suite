---
id: DOC-FEAT-TESTING-AND-FLOW
title: Testing & the Ecosystem Flow Suite
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: [contracts/flow-suite.json]
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Testing & the Ecosystem Flow Suite

Two axes prove a Dumby build: nodes tested alone, and the wiring tested together.

**The isolation axis — the pyramid.** Every class's dependencies arrive through the DI
container, so every class is testable alone. The unit and integration tiers exercise one class
or one repository-plus-service pair against the mock container and a real test database; the
smoke and E2E tiers sit above them. A green pyramid is necessary but not sufficient: it can pass
while the seams between the parts are mis-wired.

**The coordination axis — the flow spine.** The Ecosystem Flow Suite is one thread that boots
the real application and travels its wiring from bootstrap to shutdown. It runs against embedded
PostgreSQL and an in-memory Redis, with a deterministic mock gateway in place of Discord — real
wiring, local edges. Each named flow is a thread with a declared start, traversal, and end; the
registry lives in `contracts/flow-suite.json`.

**What it proves.** Each thread asserts four properties at once on the real wiring:
coordination (parts that must act in order do so in order), compatibility (cross-boundary
contracts hold at runtime), integration (a change in one file is observed by its consumers), and
environment (the process, its ports, its database, and its teardown, as one). Because it runs
the real wiring, the flow spine is also where a documented spec-vs-code divergence becomes
observable rather than hidden.

**Composition.** Isolation stays — the per-layer coverage floors are unchanged. A one-shot test
file with no cross-boundary assertion and no place in a flow is retired in favour of the flow
that covers its edge, and a change that touches a seam is complete only when the flow over that
seam passes.

See `spec/lifecycle/` §37.8–§37.13 and `contracts/flow-suite.json`.
