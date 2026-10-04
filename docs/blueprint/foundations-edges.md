---
id: BLUEPRINT-FOUNDATIONS
title: Foundations — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:foundations]
---

# Foundations — Edges

How the foundations department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/foundations/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-01-FOUNDATIONS-0001#LOAD_BEARING_IDEA -> SPEC-02-ARCHITECTURE (one DI container, one event bus, one permission engine)
- SPEC-01-FOUNDATIONS-0001#PILLARS -> SPEC-03-MODULES (Module Sovereignty defines the module contract)
- SPEC-01-FOUNDATIONS-0001#PILLARS -> SPEC/00-GOVERNANCE (One Operational Surface; ban registry)
- SPEC-01-FOUNDATIONS-0002#FAILURE_MODES -> SPEC-03-MODULES (contract enforces isolation)
- SPEC-01-FOUNDATIONS-0002#MULTIPURPOSE_COMPARISON -> SPEC-04-REQUEST-LAYER (one seven-layer resolver)
- SPEC-01-FOUNDATIONS-0003 -> SPEC/00-GOVERNANCE (each principle is enforced by a named mechanism)
- SPEC-01-FOUNDATIONS-0004#BAN_REGISTRY -> SPEC/00-GOVERNANCE (four enforcement layers per ban)
