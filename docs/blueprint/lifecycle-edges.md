---
id: BLUEPRINT-LIFECYCLE
title: Lifecycle — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:lifecycle]
---

# Lifecycle — Edges

How the lifecycle department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/lifecycle/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-07-LIFECYCLE -> orchestration/ (build pipeline)
- SPEC-07-LIFECYCLE -> SPEC-06-OPERATIONS (runbooks + SLOs)
