---
id: SPEC-08-REFERENCE-0046
title: 46. Dumby vs. Multipurpose Bots — Capability Comparison
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [DUMBY_VS_MULTIPURPOSE_BOTS, MDIS_BACKEND, PERSONA_SYSTEM_DATA_MODEL, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-REF-0046-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 46. Dumby vs. Multipurpose Bots — Capability Comparison

**Status:** [SPEC]

```
TABLE 46-A — Capability comparison

Capability                          Typical multipurpose bot        Dumby
Adding a new feature                edit shared files; risk of      add a module; zero risk to
                                    regressing unrelated features   any existing module
Third-party extensibility           rare; usually requires          first-class Marketplace tier
                                    forking the whole bot           and review pipeline
Multiple bot identities             not supported, or a separate    Twill personas, sharing the
(command/voice capacity)            bot to manage manually          same codebase and data
Zero-downtime deploys               uncommon; a deploy usually      a structural requirement,
                                    means a brief outage            enforced by state
                                                                    externalization
Per-guild feature control           often all-or-nothing, or        uniform, tier-driven
                                    ad hoc flags                    guild_module_states model
Unified permission model            re-implemented per command,     one seven-layer engine, shared
                                    inconsistent coverage           by bot and dashboard
Observability                       ad hoc console logging, if      structured logs, metrics, and
                                    anything                        traces by default, unified by
                                                                    one correlationId
Operational control plane           none — a code change and        Power Engine, CLAI, Swastik,
                                    redeploy is the only lever      and the Credentials Service,
                                                                    all independent of bot-process
                                                                    health
Compliance tooling                  bespoke per-deployment, if it   framework-level erasure and
                                    exists at all                   retention model
```

The comparison is not a claim that a conventional multipurpose bot is poorly built — it is a
claim about what becomes available, structurally and by default, once module sovereignty,
contract-based communication, and a unified operational surface are treated as load-bearing
architecture rather than as conventions a disciplined team must remember.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0046-1
  check: "The capability comparison asserts only documented, testable differentiators"
  test: tests/docs/comparison.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)
