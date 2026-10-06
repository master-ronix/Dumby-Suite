---
id: SPEC-08-REFERENCE-0008
title: Appendix C — Extended Reference: Operational Excellence
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [APPENDIX_C_EXTENDED_REFERENCE, C_1_THE_OPERATIONS, C_2_INCIDENT_RESPONSE, C_3_CAPACITY_PLANNING, C_4_DISASTER_RECOVERY, C_5_MULTI_REGION, C_6_THE_SERVICE, C_7_UPDATE_AND, C_8_THE_COMMUNITY, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: []
acceptance: [ACC-REF-0008-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Appendix C — Extended Reference: Operational Excellence

### C.1 The Operations Runbook

The operations runbook is the bot owner's guide to running Dumby in production. It covers the day-to-day operations, periodic maintenance, and incident response procedures that keep the bot healthy.

Daily operations include: check the system status dashboard (gateway connected, modules enabled, error rate normal), review P2 alerts from the last 24 hours, check the event queue depth and job queue depth for anomalies, verify that the daily backup completed successfully, and review the cache hit rate (should be above 90 percent).

Weekly operations include: review P1 alerts from the last week, check database disk usage (should be below 80 percent), review slow query logs and optimize queries taking more than 100 milliseconds, check Redis memory usage (should be below 80 percent of maxmemory), verify that the weekly test restore completed successfully, review module resource usage trends (identify modules with growing resource consumption), and update marketplace modules if updates are available.

Monthly operations include: review P0 alerts from the last month, perform a security audit (run the security audit checklist from Section 61.8), review and rotate secrets (bot token, database password, Redis password, OAuth2 client secret), review data retention compliance (verify that data older than retention periods is deleted), review and update the deployment configuration (HPA thresholds, resource limits, replica counts), review module ecosystem health (which modules are most used, which are erroring most), and plan capacity for the next month (based on growth trends).

### C.2 Incident Response

Incident response is the process of identifying, diagnosing, and resolving issues that affect the bot's availability or functionality. Dumby's incident response follows a five-step process.

Step 1 is detection. Incidents are detected by: automated alerts (Prometheus alerting rules firing P0, P1, or P2 alerts), user reports (guild owners reporting issues through the support channel), the system status dashboard (showing red or yellow indicators), or the live log viewer (showing error-level log entries).

Step 2 is triage. The bot owner (or on-call operator) assesses the incident's severity: P0 (bot is down or data is at risk — immediate response required), P1 (significant degradation — response within 1 hour), P2 (minor degradation — response within 4 hours). The severity determines the response urgency and communication requirements.

Step 3 is diagnosis. The operator uses the debugging tools (Section 68.4) to identify the root cause: check the live log viewer for error entries, check the system status dashboard for infrastructure issues, check the module management panel for module errors, check the metrics dashboard for performance anomalies, check the audit log for recent configuration changes, and check Discord's status page for ongoing incidents.

Step 4 is resolution. The operator applies the appropriate fix: restart the affected module (through the Interface Hub or the /dumby reload command), restart the affected pod (through kubectl delete pod), rollback a deployment (through the Admin tier), disable a problematic module, revert a configuration change, or escalate to the module developer (for third-party module issues).

Step 5 is post-incident review. After the incident is resolved, the operator documents: what happened (the incident description), when it happened (timeline of detection, response, and resolution), why it happened (root cause analysis), how it was resolved (the fix applied), what could be improved (preventive measures), and what follow-up actions are needed (code changes, configuration changes, monitoring improvements).

### C.3 Capacity Planning

Capacity planning ensures that the bot has sufficient resources to handle growth. The capacity planning process is based on growth trends and resource utilization metrics.

Guild growth is tracked monthly. The bot owner monitors the rate of new guild joins (average per month) and projects future growth. When the projected guild count approaches a scale tier boundary (e.g., approaching 1,000 guilds — the Medium to Large boundary), the bot owner plans the scale-up: increase the shard count, increase the pod count, upgrade the database instance, and upgrade the Redis instance.

Resource utilization is tracked weekly. The bot owner monitors CPU usage (should be below 70 percent — the HPA target), memory usage (should be below 80 percent — the HPA target), database connection pool utilization (should be below 50 percent of the pool size), Redis memory usage (should be below 80 percent of maxmemory), and disk usage (should be below 80 percent). When any resource approaches its threshold, the bot owner plans a capacity increase.

### C.4 Disaster Recovery

Disaster recovery is the process of recovering from a catastrophic failure — complete database loss, complete Redis loss, or complete infrastructure loss.

Database disaster recovery: if the primary database is lost, the recovery process is: provision a new PostgreSQL instance, restore the latest full backup from S3, replay WAL segments up to the point of failure (point-in-time recovery), verify the restore with smoke tests, update the DATABASE_URL environment variable to point to the new instance, and restart the bot pods. Data loss is limited to the time between the last WAL segment and the failure (typically less than 5 minutes, as WAL segments are archived in real-time).

Redis disaster recovery: if the Redis instance is lost, the recovery process is: provision a new Redis instance, update the REDIS_URL environment variable to point to the new instance, and restart the bot pods. No data restoration is needed — Redis is a cache, and all data in Redis can be reconstructed from the database. The L1 and L2 caches will be repopulated as the bot processes requests.

Complete infrastructure loss: if the entire Kubernetes cluster is lost, the recovery process is: provision a new Kubernetes cluster, deploy the Helm chart (or Kustomize manifests), provision new database and Redis instances, restore the database from the latest backup, update environment variables, and verify that the bot is operational. The recovery time depends on the infrastructure provider's provisioning time (typically 30-60 minutes).

### C.5 Multi-Region Deployment

For bots with a global user base, multi-region deployment provides geographic redundancy and reduced latency. Dumby supports multi-region deployment through Kubernetes node affinity and geo-distributed database read replicas.

The primary region (US East) hosts the database primary, the Redis primary, and the primary bot pods. The secondary regions (EU West, AP South) host database read replicas, Redis replicas, and regional bot pods. Traffic is routed to the nearest region via a global load balancer (like AWS Route 53 or Cloudflare).

In a regional failure (e.g., US East goes down), the failover process is: promote the EU West read replica to primary (using PostgreSQL's pg_promote command), update the DATABASE_URL to point to the new primary, restart the bot pods in EU West, and update the DNS to route all traffic to EU West. The failover takes approximately 5-10 minutes. Data loss is limited to the replication lag at the time of failure (typically less than 5 seconds).

### C.6 The Service Level Agreement

Dumby's service level agreement (SLA) defines the expected availability and performance of the bot. The SLA is a commitment to the bot owner and guild owners, not a legal contract.

Availability: the bot should be available 99.5 percent of the time per month (approximately 3.6 hours of downtime per month). This includes planned maintenance (deployments, migrations) and unplanned downtime (incidents). Availability is measured by the health check endpoint — if the readiness check returns non-200 for more than 5 consecutive minutes, it counts as downtime.

Command latency: 95 percent of commands should respond within 200 milliseconds (excluding Discord API transit time). This is measured by the dumby_command_duration_seconds histogram. Commands that exceed 500 milliseconds are logged as warnings.

Event processing: 95 percent of events should be processed within 100 milliseconds (Core tier) or 500 milliseconds (Standard/Marketplace tier). This is measured by the event_delivery_duration_ms histogram metric.

Recovery time: P0 incidents should be resolved within 1 hour. P1 incidents should be resolved within 4 hours. P2 incidents should be resolved within 24 hours.

### C.7 Update and Patch Management

Dumby's update and patch management process ensures that the bot stays current with security patches, bug fixes, and new features.

Security patches are released as patch versions (e.g., → ) and are applied immediately. The bot owner is notified of security patches through the Interface Hub's notification system. Security patches do not require configuration changes or module updates.

Bug fixes are released as patch versions and are applied during the next maintenance window (typically within 1 week of release). Bug fixes are documented in the changelog and are tested in the staging environment before deployment to production.

New features are released as minor versions (e.g., → ) and are applied during a scheduled maintenance window. New features are announced at least 1 week before release, giving the bot owner time to review the changelog and plan the update. New features are tested in the staging environment for at least 1 week before deployment to production.

Breaking changes are released as major versions (e.g., → ) and require a migration guide. The bot owner reviews the migration guide, updates custom modules, tests in the staging environment, and schedules a maintenance window for the update. Major version releases are announced at least 1 month before release.

### C.8 The Community and Ecosystem

Dumby's community and ecosystem are essential for the framework's long-term success. The community provides modules, translations, documentation, and support.

The module marketplace is the primary community contribution channel. Developers build and publish modules, which are verified by the Module Gateway and made available to guild owners. The marketplace includes a rating system (1-5 stars) and a review system, allowing guild owners to evaluate modules before installation.

The translation program allows community members to contribute translations for modules. Translations are submitted as pull requests to the module's repository and are reviewed by the module author. Accepted translations are included in the next module release.

The documentation program allows community members to contribute to the framework's documentation. Documentation includes tutorials, guides, API references, and example modules. Documentation is submitted as pull requests to the framework's repository and is reviewed by the framework team.

The support program provides community-based support through Discord (a support server where users can ask questions, report bugs, and request features). The framework team monitors the support server and responds to questions. Community members can also earn recognition by helping other users.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0008-1
  check: "The operational-excellence appendix (SLA, patching, community) matches the shipped operations"
  test: tests/docs/operational-excellence.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)
