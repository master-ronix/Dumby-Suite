# Security Documentation

This directory documents the security posture and controls for the Dumby Unified Modular Bot System.

## Security Controls

### Secrets Management

- **No secrets in source control** — ever, in any form. All secrets are injected as environment variables at pod startup via Kubernetes Secrets (or Vault/cloud secrets manager in production).
- **Secret-shaped log fields** are centrally redacted by `src/logging/logger.ts` regardless of nesting depth, using Pino's built-in `redact` option.
- **Credentials Service** (`src/entry/credentials.ts`) — the single issuance path for all runtime credentials. Tokens are Argon2id-hashed at rest and displayed exactly once.

### Authentication and Authorization

- **Permission Engine** — 7-layer resolver (`src/permissions/resolver.ts`). The fail-open/fail-closed asymmetry per layer is deliberate and matches `blueprint.md §21.4`:
  - Layer 2 (blacklist): fail-closed
  - Layer 3 (guild availability): fail-closed
  - Layer 4 (channel restriction): fail-open
  - Layer 5 (Discord bitfield): fail-closed
  - Layer 6 (RBAC): fail-closed, degrades to lowest role
  - Layer 7 (grant override): fail-open
- **RBAC** — 6-role hierarchy (OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED). Roles are resolved fresh every interaction, never cached indefinitely.
- **CLAI** — SSH public-key authentication only. No password path, no TOTP. Each operator's key is individually registered in `clai_operators` and individually revocable. CLAI **MUST NOT** be exposed on a public-facing interface (ADR 001, `directive.md` Rule 43.5).

### Input Validation

- **Zod at every trust boundary** — config schema (`env.schema.ts`), module manifests (`manifest.schema.ts`), HTTP request bodies. Unknown fields are rejected via `.strict()`.
- **No dynamic `require()`/`import()`** of unknown paths — all modules are declared in `register-all.ts`, which is generated from the known module list.
- **Webhook signature verification** infrastructure is pre-built even with no routes registered yet — a route without a verifier is rejected at registration time.

### Privilege Escalation Prevention

- **Module isolation** — enforced by 5 custom ESLint rules (see `eslint.config.mjs`). Cross-module imports fail the build; they never fail at runtime silently.
- **DI container frozen after Stage 09** — no module can overwrite a core service token after bootstrap.
- **Admin-tier commands** — silently rejected (no reply, only a warn log) for non-owners.
- **Non-production credentials are categorically distinct** from production ones — never shared or derived.

### Audit Trail

- `audit_logs` is **insert-only forever**. No `UPDATE` or `DELETE` is permitted against this table anywhere in the codebase (enforced by ESLint rule).
- Every PEP action writes an audit row before returning — success or rejection, with `actorId`, `source`, `reason`, `action`, and `outcome`.

### Network Security

- The Fastify HTTP server registers `@fastify/helmet` (security headers) and `@fastify/rate-limit` (API-level rate limiting) on every instance.
- The Credentials Service and CLAI SSH listener bind to `CREDENTIALS_SERVICE_BIND_HOST` (default `127.0.0.1`) — never `0.0.0.0` or a public interface.
- The Kubernetes manifests use a `ServiceAccount` with no cluster-level permissions beyond what the pod needs.

### Dependency Security

- `dependency-review.yml` (`.github/workflows/`) blocks PRs that introduce new critical or high-severity npm vulnerabilities.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (24 hours) as a supply-chain attack defense — newly published package versions cannot be installed until they have been live for at least one day.

### Known Limitations

1. **No runtime sandbox for third-party module code** — module `onLoad`/`onReady`/`onUnload` hooks run in-process. This is acceptable while the module catalog is first-party only. See ADR 005 for the resolution path (Worker Thread isolation for V2).
2. **CLAI is a Tier-3 scaffold** — the SSH listener stub exists but `ssh2` is not installed. The full implementation is a fast-follow (ADR 001, ADR 004).

## Security Checklist

| Control | Status |
|---|---|
| Secrets never in source control | ✅ |
| Zod at every trust boundary | ✅ |
| audit_logs insert-only (ESLint-enforced) | ✅ |
| CLAI SSH public-key only | ✅ (spec complete; implementation is Tier-3 stub) |
| Helmet headers on HTTP servers | ✅ |
| API-level rate limiting | ✅ |
| Dependency review in CI | ✅ |
| Minimum release age (24h) in pnpm catalog | ✅ |
| Secrets redacted in logs | ✅ |
| Module isolation tooling-enforced | ✅ |
| No dynamic module loading | ✅ |
| Non-prod ↔ prod credential isolation | ✅ |
