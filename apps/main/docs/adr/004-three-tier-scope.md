# ADR 004 — Three-Tier Build Scope

**Status:** Accepted  
**Date:** 2026-07-28  

---

## Context

The full DoD (Definition of Done) in `master-prompt.md §1.2` covers a very large surface area that would be impossible to deliver at full quality in a single session. Three tiers were explicitly defined to set correct expectations.

## Decision

### Tier 1 — Full implementation (production-quality, tested)

Bootstrap, DI, config/env schema, DB + migrations, cache (L1+L2+stampede guard), commands + middleware pipeline, permission resolver (7-layer), RBAC (6-role), event bus, graceful shutdown, error taxonomy, logging (Pino), metrics (prom-client), **2 shipped modules (health + hello)**, health HTTP endpoints, API + metrics HTTP servers, CI/CD (5 GitHub workflows), Kubernetes manifests, and OTel tracing init.

### Tier 2 — Functional single-node (wired but not fully tested)

Job queue (BullMQ + autoscaler), i18n (manager + formatters), rate limiting (sliding-window + fallback), Power Engine dispatcher (already in archive), Credentials Service entry point, Terraform modules (scaffolded).

### Tier 3 — Scaffolded / documented stub

CLAI SSH listener (entry point exists, `ssh2` not yet installed), Swastik developer registration (functional REST API, filesystem staging only), Personas subsystem (not started), MDIS backend (not started).

### Non-goals (explicitly out of scope)

- 22 catalog modules: no commands, no schemas, no services — skeletons only.
- `website/`, `design/`, `assets/` directories: empty placeholders.
- `src/monetization/`: empty reserved directory.

## Consequences

- Any reviewer must apply the tier label when evaluating a component.
- Tier-3 stubs contain `logger.warn('*-tier3-stub', …)` calls at startup so operators know they are running placeholder code.
- Fast-follow items (CLAI full impl, Swastik K8s-volume staging) are tracked in ADR 005.

## Sources

- `master-prompt.md §1.2` (DoD)  
- `master-prompt.md §1.3` (non-goals)
