---
id: SPEC-08-REFERENCE-0007
title: Appendix B — Extended Reference: Interface Hub
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [APPENDIX_B_EXTENDED_REFERENCE, B_1_THE_WEB, B_2_AUTHENTICATION_AND, B_3_THE_MODULE, B_4_THE_PERMISSION, B_5_THE_AUDIT, B_6_THE_LIVE, B_7_THE_SYSTEM, B_8_THE_MARKETPLACE, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-REF-0007-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Appendix B — Extended Reference: Interface Hub

### B.1 The Web Dashboard Architecture

The Interface Hub is a Single Page Application (SPA) that runs in the bot owner's or guild administrator's browser. The frontend is built with React and is served as static assets by the Fastify backend. The frontend communicates with the backend via the REST API.

The SPA architecture was chosen over a server-side rendered (SSR) approach because: the dashboard is highly interactive (configuration changes, module management, log viewing all require real-time updates without page reloads), the backend is a bot framework (not a web server — offloading rendering to the client reduces backend load), and the SPA can be cached by a CDN (reducing backend load for static assets).

The frontend uses React with TypeScript (for type safety matching the backend), React Router (for client-side routing), Tailwind CSS (for styling — utility-first CSS framework that produces small, consistent styles), and TanStack Query (for data fetching with caching, refetching, and optimistic updates). The frontend does not use a global state management library (like Redux) — TanStack Query's cache serves as the state manager for server data, and React's useState/useReducer serves as the state manager for UI state.

### B.2 Authentication and Session Management

The Interface Hub authenticates administrators through the Discord OAuth2 flow; session identity is carried by bearer tokens issued by the Credentials Service (§22.8) — the same issuance path every other authenticated HTTP surface uses, with no separate JWT machinery anywhere in the framework (§23.2). After the OAuth2 flow completes, the backend exchanges the verified Discord identity for a session bearer token with a bounded lifetime. The token is stored in an HttpOnly cookie (not in localStorage — HttpOnly cookies are not accessible to JavaScript, preventing XSS attacks from stealing the token).

For each API request, the browser automatically includes the session cookie. The backend's HTTP authentication layer verifies the bearer token against the Credentials Service (§22.8), checks the expiration, and extracts the user's identity. If the token is expired, the layer returns a 401 Unauthorized response, and the frontend automatically re-runs the OAuth2 flow to obtain a fresh session token, after which the original request is retried. If re-authentication fails, the user is redirected to the login page.

### B.3 The Module Management Panel

The module management panel is the primary interface for guild owners to manage their guild's modules. The panel displays a list of all available modules, grouped by tier (Admin, Core, Standard, Marketplace). Each module entry shows the module's name, description, current state (enabled, disabled, error), and a quick-action button (enable, disable, configure, uninstall).

Clicking on a module opens the module's detail view, which shows the module's commands (with descriptions and permission requirements), events (with subscription details), permissions (with current overrides for this guild), configuration (the MDIS panel), and resource usage (for Marketplace modules). The detail view also shows the module's recent errors (if any) and a reload button (for Admin users).

### B.4 The Permission Management Panel

The permission management panel allows guild administrators to manage permissions for their guild. The panel displays a matrix of permissions (rows) and roles/users (columns). Each cell shows the permission's state for that role or user: ALLOW (green), DENY (red), or DEFAULT (gray). The administrator can click a cell to cycle through the states: DEFAULT → ALLOW → DENY → DEFAULT.

The panel also shows the permission's default level (everyone, guild_admins, or nobody) and a description of what the permission allows. The administrator can add new roles or users to the matrix by searching for them (the search uses Discord's API to find roles and users in the guild). Changes are saved immediately (PUT /api/guilds/:guildId/permissions) and are applied in real-time — the next command invocation uses the updated permissions.

### B.5 The Audit Log Panel

The audit log panel displays the guild's audit log entries. The entries are shown in a paginated table with columns for timestamp, actor (the user who performed the action), action, target (the entity affected by the action), reason (if provided), and metadata (additional context). The table can be filtered by actor, action type, and date range. The entries can be exported as CSV (for compliance audits or record-keeping).

The audit log panel reads from the audit_logs table in the database. The table is partitioned by date (monthly partitions), ensuring that queries for recent entries are fast (they scan only the current month's partition). Entries older than the retention period (365 days) are automatically deleted by a daily background job.

### B.6 The Live Log Viewer

The live log viewer displays the bot's log entries in real-time. The viewer uses Server-Sent Events (SSE) to receive log entries from the backend — the backend publishes log entries to a Redis pub/sub channel, and the SSE endpoint subscribes to the channel and forwards entries to the browser. The viewer can be filtered by module, log level, and correlation ID. The viewer shows the last 1,000 entries and scrolls automatically as new entries arrive.

The live log viewer is available only to Admin users (bot owners). Guild administrators do not have access to the live log viewer — it may contain log entries from other guilds, which would violate privacy. The live log viewer is rate-limited to 100 entries per second (to prevent the browser from being overwhelmed during high-volume logging).

### B.7 The System Status Dashboard

The system status dashboard provides an overview of the bot's health. It shows: gateway status (connected, disconnected, reconnecting), shard count and per-shard latency, module count and per-module state, database connection pool status (active, idle, max), Redis connection status, cache hit rate, event queue depth, job queue depth, memory usage, CPU usage, and uptime. The dashboard updates every 5 seconds (polling the /api/admin/system endpoint). The dashboard is available only to Admin users.

### B.8 The Marketplace Browser

The marketplace browser allows guild owners to discover and install third-party modules. The browser displays the marketplace catalog as a grid of module cards, each showing the module's name, description, author, rating, installation count, and an "Install" button. The grid can be filtered by category (moderation, utility, music, economy, etc.) and sorted by rating, installation count, or last updated.

Clicking on a module card opens the module's detail page, which shows the full description, screenshots (if provided by the author), permissions required, configuration options, changelog, and an "Install" button. The detail page also shows reviews from other guild owners (if the marketplace supports reviews). Installing a module from the marketplace browser triggers the installation flow (Section 72.3).

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0007-1
  check: "The Interface Hub appendix matches the shipped dashboard surfaces"
  test: tests/docs/interface-hub.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)
