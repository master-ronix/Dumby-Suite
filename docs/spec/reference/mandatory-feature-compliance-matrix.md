---
id: SPEC-08-REFERENCE-0045
title: 45. Mandatory Feature Compliance Matrix
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [MANDATORY_FEATURE_COMPLIANCE_MATRI, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-REF-0045-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 45. Mandatory Feature Compliance Matrix

**Status:** [SPEC]

This section is a requirements-traceability checklist: every row names one capability this
architecture is required to provide and points to where it is specified in full. Its intended
use is a reviewer confirming that a specific deployment, fork, or audit has not silently
dropped a load-bearing capability. The matrix is generated from the **Compatibility Ledger** —
each row's "specified at" reference is derived from the contract registration it points at — so
the matrix cannot drift from the registry that gates core releases and module deployments.

```
TABLE 45-A — The compliance matrix

#   Capability                                                              Specified at
01  single, unified bootstrap sequence, no partial-start state              §8
02  graceful shutdown with independent per-step timeouts                    §9
03  fail-fast configuration validation before any gateway connection        §8.2, §23.2
04  dependency injection with compile-time-checkable contracts              §10
05  circular dependency detection at boot, not runtime                      §10.5
06  complete, self-describing module manifest contract                      §11.2
07  enforced three-layer separation within every module                     §11.5
08  tooling-enforced module isolation (no cross-module imports/writes)      §11.6
09  four-tier module governance model                                       §13
10  per-guild module enable/disable with fail-closed defaulting             §13.4
11  five-layer Admin-tier defence in depth                                  §13.6
12  five sanctioned, and only five, inter-module patterns                   §14.1
13  graceful soft-dependency degradation                                    §14.2
14  semver-enforced cross-module contract versioning                        §14.3, §42.1
15  hot-swap of a single module without a core restart                      §15.1, §15.8
16  worker-thread isolation for CPU-intensive work                          §15.2
17  scheduled, zero-downtime core restart independent of ad hoc deploys     §15.5
18  developer registration, licensing gate, and revocable approval          §15.6–§15.7
19  five-gate community module review pipeline                              §16.4
20  schema-driven, accessible web configuration UI (MDIS)                   §16.5
21  fatal, build-time command-name collision detection                      §17.3
22  bounded, batched guild command change queue                             §17.7
23  enforced 100-command-per-guild ceiling                                  §17.8
24  five-step guild-facing command collision resolution                     §17.9
25  no text-prefix commands, no simulated prefix parsing                    §4, §17.10
26  per-handler isolation on gateway event dispatch                         §18.3
27  bounded internal-event-bus cycle detection                              §18.5
28  composable, priority-ordered middleware with one root error boundary    §19
29  stateless, database-referencing component custom_id scheme              §20.1
30  mandatory re-authorization on sensitive component clicks                §20.3
31  seven-layer permission resolution — the single normative ordering        §21
32  global bot-owner override that bypasses every other layer               §21.2
33  Layer 7 guild-side grants — five types, module commands only            §21.6
34  one permission engine shared by bot and dashboard                       §21.7
35  global administrative authority via a documented function catalogue     §22.2–§22.3
36  out-of-band operator access independent of gateway health (CLAI)        §22.6
37  single, shared credential issuance path                                 §22.8
38  three-scope configuration model                                         §23.1
39  full config-change audit trail                                          §23.5
40  repository pattern as the sole database abstraction                     §24.3
41  every migration reversible (working down)                               §24.4
42  two-tier cache with stampede protection and negative caching            §25
43  zero process-local state whose loss would be user-visible               §26.1–§26.2
44  shard-ownership lock model preventing dual shard connections            §26.4
45  correlated logs, metrics, and traces via one correlationId              §27.1
46  error taxonomy with operational/non-operational distinction             §28.1
47  idempotency required of every job processor                             §29.3
48  reachable maintenance mode that cannot lock out its own operators       §28.6
49  core-owned Renderer — Components v2 grammar, slots, Modes D/M/C         §20.8
50  buffer embed on every interaction, edited into the final render/notice  §20.9
51  classic embeds banned via four enforcement layers                       §4, §38.4
52  six-state licence machine with devId-equals-subject binding             §15.7
53  Compatibility Ledger gating releases; this matrix generated from it     §14.4
54  four per-tier module volumes, tier-at-rest, blind discovery             §5.4, §7.3
55  first-class manifest visibility enum, validated at all three points     §11.2, §13.3
56  deployment rate limits on every deployment surface                      §13.6
57  repository-triggered deployment with durable Deployment Records         §15.11
58  instant MDIS ↔ backend sync over per-guild pub/sub                      §16.5
59  envelope encryption for recoverable credentials; Argon2id otherwise     §32.7
60  Twill personas: bring-your-own-identity, single-server, free charter    §35
```

Beyond these sixty, every capability specified in Parts V–IX that is not enumerated above —
locale resolution (§30), MTP usage metering (§31.4), the full security architecture (§32),
SLO-driven alerting (§33.5), privacy and erasure (§34), persona governance (§35.5), the testing
pyramid (§37.2), and the complete CI/CD and infrastructure reference (§40–§41) — is load-bearing
in its own right; these rows are the capabilities most load-bearing to get right *first*.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0045-1
  check: "The 60-row compliance matrix regenerates from the Compatibility Ledger with no drift"
  test: tests/ci/compliance-matrix.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)

## Named entities

**classes, interfaces & symbols:** `Engine-tunable`, `OIDC-validated`
