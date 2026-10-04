---
id: BLUEPRINT-MODULES
title: Modules — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:modules]
---

# Modules — Edges

How the modules department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/modules/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-03-MODULES -> SPEC-02-ARCHITECTURE (modules load into the core DI child container)
- SPEC-03-MODULES -> SPEC/00-GOVERNANCE (tier + licence rules)
- SPEC-03-MODULES#SWASTIK -> SPEC-06-OPERATIONS (hot-swap + promotion pipeline)
