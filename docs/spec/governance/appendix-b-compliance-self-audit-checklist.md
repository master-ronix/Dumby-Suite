---
id: SPEC-00-GOVERNANCE-0012
title: APPENDIX B — COMPLIANCE SELF-AUDIT CHECKLIST
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-governance]
contracts: []
acceptance: [ACC-GOV-0012-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# APPENDIX B — COMPLIANCE SELF-AUDIT CHECKLIST

Before declaring a milestone complete, the owning engineer confirms the
following, which condense the MUST rules most load-bearing to get right
first (mirroring blueprint §45's mandatory feature matrix):

````
[ ] 01  Single unified bootstrap; no partial-start state
[ ] 02  Graceful shutdown with independent per-step timeouts
[ ] 03  Fail-fast config validation before any gateway connection
[ ] 04  DI with compile-time-checkable contracts; no service locator
[ ] 05  Circular-dependency detection at boot, not runtime
[ ] 06  Complete, self-describing module manifest contract (Zod, Stage 11)
[ ] 07  Three-layer separation enforced within every module
[ ] 08  Tooling-enforced module isolation (no cross-module imports/writes)
[ ] 09  Four-tier module governance with tier co-constraints
[ ] 10  Per-guild enable/disable, fail-closed defaulting
[ ] 11  Five-layer Admin-tier defense in depth
[ ] 12  Five — and only five — sanctioned inter-module patterns
[ ] 13  Graceful soft-dependency degradation
[ ] 14  Semver-enforced cross-module contract versioning
[ ] 15  Hot-swap of a single module without a core restart
[ ] 16  Worker-thread/process isolation for CPU-intensive work
[ ] 17  Scheduled zero-downtime core restart independent of ad hoc deploys
[ ] 18  Developer registration, licensing gate, revocable approval
[ ] 19  Five-gate community module review pipeline
[ ] 20  Schema-driven configuration UI contract (MDIS) — contract only;
         presentation excluded from this directive's scope
[ ] 21  Fatal, build-time command-name collision detection
[ ] 22  Bounded, batched guild command change queue
[ ] 23  Enforced 100-command-per-guild ceiling
[ ] 24  Documented guild-facing command collision resolution
[ ] 25  The Ban Registry holds: no text-prefix commands, no classic
         embeds, no unsolicited DMs — each enforced at all four layers
[ ] 26  Per-handler isolation on gateway event dispatch
[ ] 27  Bounded internal-event-bus cycle detection
[ ] 28  Priority-ordered middleware with a single root error boundary
[ ] 29  Stateless, database-referencing component custom_id scheme
[ ] 30  Mandatory re-authorization on sensitive component interactions
[ ] 31  Seven-layer permission resolution, fail-closed where it matters
[ ] 32  Global bot-owner override bypassing every other layer
[ ] 33  Explicit per-user/role grant overrides (Layer 7)
[ ] 34  One permission engine shared across every consuming surface
[ ] 35  Power Engine global authority via the documented control-domain catalog
[ ] 36  Out-of-band operator access independent of gateway health (CLAI)
[ ] 37  Single shared credential issuance path
[ ] 38  Three-scope configuration model
[ ] 39  Full configuration-change audit trail
[ ] 40  Repository pattern as the sole database abstraction
[ ] 41  Every migration reversible (working down())
[ ] 42  Two-tier cache with stampede protection and negative caching
[ ] 43  Zero process-local user-visible state
[ ] 44  Shard-ownership lock model preventing dual shard connections
[ ] 45  Correlated logs/metrics/traces via one correlationId
[ ] 46  Eight-subclass error taxonomy with operational distinction
[ ] 47  Idempotency required of every job processor
[ ] 48  Reachable maintenance mode that cannot lock out its own operators
[ ] 49  Pino sole logger enforced — `no-console` lint with the single
         logger exemption; no direct console use anywhere
[ ] 50  CI hygiene: every action SHA-pinned (40-hex), no `${{ secrets.* }}`
         inside run: blocks, Dependabot active, check-workflows.mjs gating
[ ] 51  Every environment key consumed by code or documented in the
         operator runbook; production INTERNAL_API_KEY ≥ 32 chars;
         DEV_GUILD_ID a valid snowflake failing fast at Stage 02
[ ] 52  Event catalog enforced: membership, payload-schema, and
         prefix-prohibition lint all present
[ ] 53  The Compatibility Ledger gates core releases and module
         deployments; the §45 matrix is generated from it
[ ] 54  Deferred greenfield work stays excluded — nothing on the list is
         smuggled into correction work
````

## Acceptance
```acceptance
- id: ACC-GOV-0012-1
  check: "The compliance self-audit checklist items are individually checkable"
  test: tests/ci/compliance-checklist.spec.ts
```
