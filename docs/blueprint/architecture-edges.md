---
id: BLUEPRINT-ARCHITECTURE
title: Architecture — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:architecture]
---

# Architecture — Edges

How the architecture department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/architecture/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-02-ARCHITECTURE-0005#TIER_VOLUMES -> SPEC-03-MODULES (modules live on the four per-tier volumes)
- SPEC-02-ARCHITECTURE-0005#POSTGRES_REDIS -> SPEC-05-DATA (PostgreSQL = system of record; Redis = acceleration)
- SPEC-02-ARCHITECTURE-0006#COMMAND_TRACE -> SPEC-04-REQUEST-LAYER (the trace is the request pipeline)
- SPEC-02-ARCHITECTURE-0006#MODULE_COMMS -> SPEC-03-MODULES (five sanctioned patterns)
- SPEC-02-ARCHITECTURE-0007 -> blueprint/structure.md (structure edges)
- SPEC-02-ARCHITECTURE-0007#TIER_VOLUMES -> SPEC-03-MODULES
- SPEC-02-ARCHITECTURE-0008#BOOTSTRAP -> all departments (bootstrap wires every subsystem)
- SPEC-02-ARCHITECTURE-0008#WORKER_BOOTSTRAP -> SPEC-06-OPERATIONS (worker mode skips gateway stages)
- SPEC-02-ARCHITECTURE-0009 -> SPEC-06-OPERATIONS (K8s terminationGracePeriodSeconds)
- SPEC-02-ARCHITECTURE-0010#CHILD_CONTAINERS -> SPEC-03-MODULES (module-scoped child containers)
