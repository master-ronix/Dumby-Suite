---
id: SPEC-00-ORIENTATION-0000-0000-0-3-ROSETTA-STONE-CONCEPT
title: 0.3 Rosetta Stone — Conceptual Map
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0003-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 0.3 Rosetta Stone — Conceptual Map

A reader arriving with general backend vocabulary rather than Dumby-specific terms
gets the fastest path to the right section here.

```
CONCEPT LOOKUP TABLE

Middleware / interceptor chain ......... §19 (Middleware Pipeline)
Dependency injection / IoC container .... §10 (DI & Service Container)
Connection pooling ....................... §24.2 (Why PostgreSQL / pooling)
Background job processing ................ §29 (Job Queue & Scheduling)
Observability (logs/metrics/traces) ...... §27 (Observability)
Process-level configuration ............... §23.1 (Configuration Scopes)
Per-tenant (per-guild) configuration ...... §23.3 (Guild Configuration)
Caching layer / cache-aside ............... §25 (Caching Architecture)
Rate limiting & cooldowns ................. §21.5 (Rate Limiting)
Internal pub/sub event bus ................ §18 (Event Architecture)
UI component / interaction routing ........ §20 (Interaction & Components)
Repository / data-access layer ............ §24.3 (Repository Pattern)
Schema migrations ......................... §24.4 (Migrations)
Horizontal scaling / stateless processes .. §26 (State Externalization)
Security hardening & threat model ......... §32 (Security Architecture)
Capacity planning & SLOs .................. §33 (Performance Engineering)
Regulatory / privacy compliance ........... §34 (Privacy & Compliance)
Startup / shutdown lifecycle .............. §8–§9 (Bootstrap & Shutdown)
Admin web dashboard ....................... §16.4 (MDIS)
Plugin marketplace ......................... §16 (Marketplace & Extension)
Testing strategy .......................... §37 (Testing Architecture)
CI/CD & infrastructure-as-code ............. §40–§41 (CI/CD, Infra & Deployment)
Linting / formatting / commit discipline ... §38 (Developer Experience)
Plugin / module architecture .............. §11, §13 (Module Anatomy, Tiers)
Cross-module contracts ..................... §14 (Inter-Module Communication)
Command routing ........................... §17 (Command Framework)
Runtime & language choice ................. §5 (Technology Stack)
Discord SDK / gateway integration .......... §5.6, §17, §20
Design philosophy / first principles ....... §1–§3 (Foundations)
Role-based access control (RBAC) .......... §21.3–§21.7 (RBAC, Groups, Grants)
Global administrative override ............. §22 (Power Engine Panel)
Operator terminal / break-glass access ..... §22.6–§22.8 (CLAI)
Multiple bot identities / voice capacity ... §35 (Twill & Personas)
Hot reload / zero-downtime deploy .......... §15 (Swastik)
```

## Acceptance
```acceptance
- id: ACC-ORI-0003-1
  check: "The Rosetta Stone map covers the documented concept clusters"
  test: tests/docs/rosetta.spec.ts
```
