# tools/release_manager/

Release Manager tooling — the release-time Compatibility Ledger gate
(`blueprint.md` §14.4 · `directive.md` D-8.10).

This directory was previously a reserved placeholder. M5 of the re-baseline
stands up the machine-readable `compatibility-ledger.json` and the shared gate
CLI `release-gate.ts`, both driven by the same `CompatibilityLedger` engine the
Swastik promotion path uses under `apps/main/src/licensing/`, so the
release-time (core) and promotion-time (module) gates share one enforcement
implementation.

## Files

- `compatibility-ledger.json` — the machine-readable ledger. Empty but
  enforced (Phase 0 skeleton): any module deployment that declares a contract
  window over an unregistered contract is refused.
- `release-gate.ts` — CLI applying the ledger as a gate.

## Run

```sh
# Core release gate — every window held by a currently-deployed module must be
# satisfied by the proposed core contract versions.
tsx tools/release_manager/release-gate.ts core \
  --ledger tools/release_manager/compatibility-ledger.json \
  --proposed manifest-schema=1.2.0 \
  --deployed moderation

# Module deployment gate — the module's declared windows must be satisfied by
# the running core and every co-deployed dependency.
tsx tools/release_manager/release-gate.ts module \
  --ledger tools/release_manager/compatibility-ledger.json \
  --module moderation \
  --windows manifest-schema:1.0.0:2.0.0 \
  --coDeployed logging-lib
```

Exit code 0 = allowed; 1 = refused with the violating contract windows printed.