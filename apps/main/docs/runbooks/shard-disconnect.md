# Runbook — Shard Disconnect

**Authority:** `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43.3 (SPEC-07-LIFECYCLE).
**Symptom:** The gateway-latency gauge for a specific shard goes stale or the shard stops
appearing in metrics.

## Steps

1. Confirm scope **first** — one shard, every shard on one pod, or fleet-wide. One shard is
   likely a Discord-side gateway session issue (discord.js reconnection handles it); every
   shard on one pod is a pod-level network problem; fleet-wide is a Discord platform incident.
2. Check whether the affected shard's ownership lock is still held by the pod that should own
   it, or expired and unclaimed — a stuck, unclaimed lock after a pod crash is the failure mode
   to check.
3. If the lock is unclaimed and no pod is retrying acquisition, verify the retry loop is running
   rather than manually editing the lock — a manual edit risks the dual-ownership scenario the
   lock exists to prevent.
4. A single graceful pod restart is almost always sufficient and safer than any manual
   lock-table edit.

## Verify

- Shard-ownership lock: `apps/main/src/discord/shard-ownership.ts`
