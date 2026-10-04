---
id: SPEC-00-ORIENTATION-0000
title: 0.1 What This Document Is
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0001-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 0.1 What This Document Is

This is a standalone, developer-facing engineering reference for Dumby, a Discord bot
architecture built around a single governing idea: a bot framework should be **one
coherent application** from the outside and **N independently-owned modules** from the
inside, with a hard, tooling-enforced wall between "coherent" and "monolithic." Nothing
in the pages that follow assumes you have read any other document first. Every
subsystem — bootstrap, the module contract, the permission engine, the data layer, the
deployment machinery — is specified completely: purpose, structure, execution flow,
failure modes, defaults, and the reasoning behind each non-obvious choice.

This reference is organized so it can be read two ways:

- **Front to back**, as a systems-design narrative — each Part builds on guarantees
 established by the Part before it.
- **As a lookup reference**, using the Concept Index (§0.3) or the Glossary & Topic
 Index (§47) to jump directly to the mechanism you need.

Where the source material treated something as a finished decision, this reference
keeps that decision and explains the engineering trade-off behind it. Where additional
depth adds real value to a developer building on top of Dumby — worked examples, fuller
sequence diagrams, explicit edge-case tables — this reference adds it. Nothing here
requires cross-referencing an external document to be understood.

## Acceptance
```acceptance
- id: ACC-ORI-0001-1
  check: "The orientation states document type, version, and authority"
  test: tests/docs/orientation.spec.ts
```
