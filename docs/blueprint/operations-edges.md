---
id: BLUEPRINT-OPERATIONS
title: Operations — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:operations]
---

# Operations — Edges

How the operations department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/operations/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)
