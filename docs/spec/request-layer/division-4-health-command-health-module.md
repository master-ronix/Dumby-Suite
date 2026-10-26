---
id: SPEC-04-REQUEST-LAYER-0007
title: DIVISION 4 — /health COMMAND (HEALTH MODULE)
kind: spec
status: normative
version: 5.0.0
authority_scope: [04-request-layer]
anchors: [DIVISION_4_HEALTH_COMMAND, OVERVIEW, COMMAND_SPECIFICATION, HEALTH_PAGE_LAYOUT_MODE, HEALTH_DATA_POINTS, DENSITY_MODES_HEALTH, DISPLAY_FORMAT_FAILURE_PRESENTATIO, TITLE_ATTRIBUTION, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/rbac.enums.json, contracts/commands.json, contracts/ui-renderer.schema.json, contracts/events.catalog.json]
acceptance: [ACC-REQ-0007-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## DIVISION 4 — /health COMMAND (HEALTH MODULE)

---

### 4.1 Overview

The `/health` command is a Core-tier module shipping a single slash command. It provides comprehensive system health information covering hardware, software, bandwidth, network, API ping latency, module count, server usage, and as much health-related data as possible. This is the diagnostic surface for the bot. The health page is the canonical demonstration of the density modes: the same report renders in full detail (D), as a condensed summary (M), or as a single status line (C).

### 4.2 Command Specification

**Command name:** `/health`
**Module:** `health` (Core-tier, single-command module)
**Description:** Displays comprehensive system health and diagnostic information.
**Arguments:** None.
**Permissions:** Available to all users (Core-tier, governed by native Discord permissions).
**Response:** Buffer embed, then the health page render in place of the navigation message.

### 4.3 Health Page Layout — Mode D

```
┌─────────────────────────────────────────────────────────┐
│                    BANNER (YouTube thumbnail size)        │
│  [Dumby health banner — default or custom]               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dumby | Health                                           │
│  -# Developed by Quixotic Mnemonics                       │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 SYSTEM HEALTH REPORT                                  │
│                                                           │
│  ━━ Discord API ━━                                        │
│  Gateway Ping:     42ms                                   │
│  REST API Ping:    38ms                                   │
│  Gateway Status:   Connected                              │
│  Shard Count:      1                                      │
│  Session Start:    2026-09-18 10:30:00 UTC                │
│  Reconnects:       0                                      │
│                                                           │
│  ━━ Bot Process ━━                                        │
│  Uptime:            3d 4h 12m                             │
│  Node.js Version:   v22.x.x                               │
│  Memory Usage:      128.5 MB / 512 MB                     │
│  CPU Usage:         2.3%                                  │
│  Heap Used:         64.2 MB                                │
│  Heap Total:         128.0 MB                            │
│  Event Loop Lag:    1.2ms                                  │
│  Active Handles:   15                                     │
│  Active Requests:   3                                      │
│                                                           │
│  ━━ Modules ━━                                             │
│  Total Loaded:      8                                      │
│  Core-tier:         7 (dashboard, health, browse, queue,  │
│                          persona, permit, modules)         │
│  Standard-tier:     1 (hello-world)                       │
│  Marketplace-tier:  0                                      │
│  Admin-tier:        0                                      │
│  Error Count:       0                                      │
│                                                           │
│  ━━ Database ━━                                           │
│  PostgreSQL Status: Connected                              │
│  Connection Pool:   8/20 active                            │
│  Query Latency:     2.1ms avg                             │
│  Migration Version: 0035                                    │
│                                                           │
│  ━━ Cache ━━                                              │
│  Redis Status:      Connected                              │
│  L1 Cache Size:     1,247 entries                          │
│  L2 (Redis) Keys:   3,891 entries                          │
│  Hit Rate:          94.2%                                   │
│                                                           │
│  ━━ Network ━━                                            │
│  Outbound Bandwidth: 1.2 MB/s                              │
│  Inbound Bandwidth:  0.8 MB/s                              │
│  Active HTTP Requests: 2                                    │
│  External API Status:  All operational                     │
│                                                           │
│  ━━ Guilds & Users ━━                                     │
│  Total Guilds:      142                                     │
│  Total Users:       8,432                                  │
│  Active Interactions (24h): 1,205                          │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  -# Developed by Quixotic Mnemonics                     │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  [INTERACTIVE DROPDOWN — Navigate to other pages]         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Health Data Points

The `/health` command must contain each and every piece of information about the Dumby system — hardware, software, bandwidth, network, API ping latency, module count, server usage, and as much health-related data as possible:

**Discord API health:**
- Gateway WebSocket ping (milliseconds)
- REST API ping (milliseconds)
- Gateway connection status (Connected/Reconnecting/Disconnected)
- Active shard count
- Session start time
- Reconnect count since startup
- Discord API rate limit status (remaining/global limit)

**Bot process health:**
- Process uptime (days/hours/minutes)
- Node.js runtime version
- Memory usage (RSS, heap used, heap total, external)
- CPU usage percentage
- Event loop lag (milliseconds)
- Active handles count
- Active requests count
- Garbage collection stats (if available)

**Module health:**
- Total loaded module count
- Breakdown by tier (Admin, Core, Standard, Marketplace)
- Module error count (total across all modules)
- Any modules in ERROR state (listed by name)

**Database health:**
- PostgreSQL connection status
- Connection pool utilisation (active/max)
- Average query latency
- Current migration version
- Database size (if queryable)

**Cache health:**
- Redis connection status
- L1 cache (in-memory) entry count
- L2 cache (Redis) key count
- Cache hit rate percentage
- Redis memory usage

**Network health:**
- Outbound bandwidth (bytes/second)
- Inbound bandwidth (bytes/second)
- Active HTTP requests
- External API connectivity status
- HttpService circuit breaker state (open/closed per host)

**Guild & user metrics:**
- Total guild count
- Total user count (users who have interacted with the bot)
- Active interactions in the last 24 hours
- Commands invoked in the last 24 hours (count)

**Job queue health:**
- BullMQ queue status
- Active job count
- Failed job count
- Dead letter queue count

### 4.5 Density Modes — Health

- **Mode D:** The full report — every section and every data point above.
- **Mode M:** No banner; one status line per section (Discord API, Bot Process, Modules, Database, Cache, Network, Guilds & Users, Job Queues) with each section's headline values only (gateway ping, uptime, module total, connection states, hit rate, guild count).
- **Mode C:** A single status line — overall state (operational/degraded), gateway ping, uptime, and module count — plus the footer mode control.

### 4.6 Display Format & Failure Presentation

The health data is displayed as structured text within the content slot, organized into clearly delimited sections (visual separators like `━━`). Each section has a header emoji and title. The data is presented in a key-value format with aligned colons for readability.

Degraded subsystems are flagged in place: a failed or reconnecting subsystem renders its section header with a warning marker and its degraded values; the overall Mode C status line reflects the worst subsystem state. If the health command itself cannot complete — because the module is unavailable or the bot is in maintenance mode — the user sees the formal notice frame with the appropriate reason code (`GUILD_UNAVAILABLE`, `MAINTENANCE`, or `MODULE_ERROR`) rather than a partial or stale report.

### 4.7 Title & Attribution

The health page uses:
```
Dumby | Health
-# Developed by Quixotic Mnemonics
```

---

---

### 4.8 Health Page Redesign (UR-20261011-008) — the current arrangements

> **Authority.** The operator's final authority (UR-20261011-008, 11/10/2026); supersedes the earlier
> clauses of this Division where they conflict.

- **At-a-glance board.** The content leads with a **status headline** — an overall state dot and
  word (`🟢 Operational` / `🟡 Degraded` / `🔴 Down`) over a compact `-#` summary (uptime · Node ·
  module count · guild count). Each subsystem is then **one compact line**: a status dot, the bold
  subsystem name, and its metrics as `-#` subtext. The in-content title is `System Health` (the
  frame title already names the surface); the former `📊 SYSTEM HEALTH REPORT` banner is retired.
- **Subsystem status.** Each subsystem carries a status (`ok` / `warn` / `down`) from its connection
  state. The overall state is the worst subsystem: a critical subsystem (the Discord gateway or the
  database) down is `down`; a non-critical one (the cache) down is `degraded`; otherwise
  `operational`.
- **Refresh control.** A **Refresh** control (a generated bold white circular-arrow icon,
  `dumby_refresh`) sits **in-line with the status headline** (a Section accessory). Selecting it
  re-dispatches the page, re-running the health handler so the report re-gathers its data.
- **No data lost.** Every data point §4.4 specifies and the page already gathers remains visible.

## Contract
- `contracts/rbac.enums.json`
- `contracts/commands.json`
- `contracts/ui-renderer.schema.json`
- `contracts/events.catalog.json`

## Acceptance
```acceptance
- id: ACC-REQ-0007-1
  check: "`/health` returns Ping/Latency via Components V2"
  test: tests/integration/health.spec.ts
```

## Edges (-> blueprint)
- SPEC-04-REQUEST-LAYER -> SPEC-02-ARCHITECTURE (dispatch enters the core runtime)
- SPEC-04-REQUEST-LAYER#RENDERER -> documentation/ (every surface is renderer-issued)
