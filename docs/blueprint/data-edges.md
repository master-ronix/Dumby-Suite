---
id: BLUEPRINT-DATA
title: Data — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:data]
---

# Data — Edges

How the data department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/data/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-05-DATA -> SPEC-02-ARCHITECTURE (PostgreSQL system of record; Redis acceleration)
- SPEC-05-DATA -> SPEC-03-MODULES (each module owns its tables)
