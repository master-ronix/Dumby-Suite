# `src/monetization/` — Reserved

This directory is intentionally empty in V1.

**Purpose:** Monetization adapters, models, and services for future billing integration. MTP (Metric Track Protocol) usage metering infrastructure lives under the core framework, not here — this directory is strictly for payment/billing logic that has not yet been designed or contracted.

**Status:** Explicitly out of scope for the initial build (master-prompt.md §1.3). Do not add any imports from this directory into the core or any module.

When monetization is implemented, it will go here as `adapters/`, `models/`, and `services/` sub-directories, each isolated from the core framework.
