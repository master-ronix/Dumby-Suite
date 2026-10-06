# Operational Runbooks

The five operational runbooks specified in `docs/spec/lifecycle/troubleshooting-operational-runbooks.md` §43
(SPEC-07-LIFECYCLE), each executable against the running system:

| # | Runbook | File |
|---|---------|------|
| 43.1 | Startup Failure | `startup-failure.md` |
| 43.2 | High Error Rate | `high-error-rate.md` |
| 43.3 | Shard Disconnect | `shard-disconnect.md` |
| 43.4 | Memory Growth | `memory-growth.md` |
| 43.5 | Slow Command | `slow-command.md` |

§43.7 (Module Hot-Swap Failure) is additionally covered by the Swastik promotion rollback path.
