---
id: BLUEPRINT-REQUEST-LAYER
title: Request Layer — Edges
kind: blueprint
status: normative
version: 5.0.0
authority_scope: [edges:request-layer]
---

# Request Layer — Edges

How the request layer department connects to the rest of the system. These are the *edges* (interconnection, dependency, coordination); the *nodes* (behaviour) live in `spec/request-layer/`. Each edge is `SOURCE -> TARGET (why)`.

- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
