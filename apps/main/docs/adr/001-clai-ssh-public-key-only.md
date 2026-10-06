# ADR 001 — CLAI Authentication: SSH Public Key Only

**Status:** Accepted  
**Date:** 2026-07-28  
**Resolves:** Conflict 1 between `blueprint.md` and `documentation.md`

---

## Context

`documentation.md` mentions "TOTP + password" as a secondary CLAI authentication path and describes CLAI as optionally public-facing. `blueprint.md §22.5` and `directive.md Rule 43.5` state SSH public-key-only and mandate in-cluster-only access.

## Decision

**CLAI uses SSH public-key authentication exclusively.** No password path. No TOTP. No public-facing Ingress.

Authentication is performed by the `ssh2` library against the `clai_operators` table (`registered=true AND revoked_at IS NULL`). The operator's SSH public key is stored in the database. Sessions are bound to `CREDENTIALS_SERVICE_BIND_HOST` (default `127.0.0.1`).

## Consequences

- Operators must generate an Ed25519 keypair and register the public half via the Credentials Service before first CLAI access.
- Break-glass access goes through a dedicated runbook (not a password fallback).
- CLAI is only reachable via bastion, VPN, or in-cluster tooling. This is the correct security posture for a bot management CLI.
- The TOTP path from `documentation.md` is permanently retired.

## Sources

- `blueprint.md §22.5` (binding)  
- `directive.md Rule 43.5` (binding)  
- `documentation.md §14.3` (superseded)
