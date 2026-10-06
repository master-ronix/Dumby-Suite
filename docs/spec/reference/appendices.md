---
id: SPEC-08-REFERENCE-0048
title: 48. Appendices
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [APPENDICES, APPENDIX_A_COMPLETE_ENVIRONMENT, APPENDIX_B_METRICS_CATALOG, APPENDIX_C_ERROR_TAXONOMY, APPENDIX_D_TIER_QUICK, APPENDIX_E_ENGINEERING_PRINCIPLES, APPENDIX_F_DISCORD_API, APPENDIX_G_KUBERNETES_RESOURCE, APPENDIX_H_MONITORING_DASHBOARD, APPENDIX_I_TROUBLESHOOTING_QUICK, CONTRACT, ACCEPTANCE]
contracts: []
acceptance: [ACC-REF-0048-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 48. Appendices

### 48.1 Appendix A — Complete Environment Variable Reference

```
TABLE 48-A — Every process-level variable referenced in this document

Variable                          Default      Specified at
NODE_ENV                          (required)   §23.2
LOG_LEVEL                         info         §23.2, §27.2
BOT_TOKEN                         (required)   §23.2, §32.1
BOT_OWNER_IDS                     (required)   §13.6, §23.2
DEV_GUILD_ID                      (required)   §13.2, §13.6, §23.2
DATABASE_URL                      (required)   §23.2
DATABASE_POOL_MAX                 10           §23.2, §33.4
DATABASE_STATEMENT_TIMEOUT_MS     10,000       §23.2, §33.4
DATABASE_REPLICA_URLS             (optional)   §23.2, §24.6
DATABASE_REPLICA_MAX_LAG_MS       1,000        §23.2, §24.6, §26.5
REDIS_URL                         (required)   §23.2
HEALTH_PORT                       8081         §23.2
RATE_LIMIT_USER_WINDOW_MS         60,000       §21.5, §23.2
RATE_LIMIT_USER_MAX               10           §21.5, §23.2
RATE_LIMIT_GUILD_WINDOW_MS        60,000       §21.5, §23.2
RATE_LIMIT_GUILD_MAX              100          §21.5, §23.2
CACHE_L1_MAX_ENTRIES              5,000        §23.2, §25.1
CACHE_L1_MAX_BYTES                50 MB        §23.2, §25.1
TRACE_SAMPLE_RATE                 0.1          §23.2, §27.4
SLOW_QUERY_THRESHOLD_MS           500          §23.2, §24.6, §43.5
CRITICAL_QUERY_THRESHOLD_MS       2,000        §23.2, §24.6
EVENT_LOOP_LAG_SHED_THRESHOLD_MS  50           §23.2, §28.5
EVENT_BUS_MAX_EMIT_DEPTH          20           §18.5, §23.2
SHARD_LOCK_HEARTBEAT_MS           10,000       §23.2, §26.4
SHARD_LOCK_RETRY_MS               2,000        §23.2, §26.4, §43.3
TELEMETRY_ENABLED                 false        §31.5
{MODULE_NAME}_*                   module-defined  §11.2, §23.4
```

The runtime schema (`apps/main/src/config/env.schema.ts`) is the authority; it additionally
carries the control-plane ports (Power Engine 8083, CLAI 8084, Swastik 8085, Credentials 8086,
Twill 8090) and the module-volume paths, and it validates `INTERNAL_API_KEY` to at least 32
characters in production. Where this table and the schema differ, the schema wins and the
difference is recorded in `status/code-reconciliation.json` (REC-011).

### 48.2 Appendix B — Metrics Catalog

Restated from §27.3 for standalone reference:

```
dumby_commands_total{module,command,status}
dumby_command_duration_seconds{module,command}
dumby_cache_requests_total{tier,result}
dumby_errors_unexpected_total{module}
dumby_queue_depth{queueName}
dumby_queue_job_duration_seconds{queueName,status}
dumby_db_pool_active_connections
dumby_db_query_duration_seconds{table,operation}
dumby_shard_gateway_latency_ms{shardId}
dumby_guild_module_active{moduleSlug}
gatewayEventsShedTotal
```

### 48.3 Appendix C — Log Levels & Reason Codes

```
Log levels:  trace · debug · info · warn · error          (§27.2)

Notice reason codes:  UNKNOWN_COMMAND · MAINTENANCE · NOT_FOUND · FORBIDDEN · RESTRICTED ·
                      COOLDOWN · RATE_LIMITED · GUILD_UNAVAILABLE · MODULE_ERROR · OVERDUE
                                                          (§20.9)
```

### 48.4 How To Verify This Section Against the Code

- The environment schema (the authority for Appendix A):
  `apps/main/src/config/env.schema.ts`.
- The metric families (Appendix B): `apps/main/src/metrics/registry.ts`.
- The notice reason codes (Appendix C): `apps/main/src/rendering/core-renderer.ts`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0048-1
  check: "The appendices are index-only and cite the sections they summarise"
  test: tests/docs/appendices.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)

## Named entities

**classes, interfaces & symbols:** `Credentials-Service`, `Grafana`, `LoadBalancer`, `PodDisruptionBudget`, `maxReplicas`, `minAvailable`, `minReplicas`, `targetCPUUtilizationPercentage`

**config/env constants:** `REMINDERS_MAX_HORIZON_`
