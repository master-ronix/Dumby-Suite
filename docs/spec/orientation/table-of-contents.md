---
id: SPEC-00-ORIENTATION-0002
title: TABLE OF CONTENTS
kind: spec
status: normative
version: 5.0.0
authority_scope: [00-orientation]
contracts: []
acceptance: [ACC-ORI-0002-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## TABLE OF CONTENTS

### PART 0 — ORIENTATION

### PART I — FOUNDATIONS

- [1. What Is Dumby](#1-what-is-dumby)
- [2. The Unified Modular Doctrine](#2-the-unified-modular-doctrine)
- [3. Engineering Principles (P1–P14)](#3-engineering-principles-p1p14)
- [4. Non-Goals & Explicit Boundaries](#4-non-goals--explicit-boundaries)
### PART II — ARCHITECTURE

- [5. Technology Stack & Decision Matrix](#5-technology-stack--decision-matrix)
- [6. System Architecture](#6-system-architecture)
- [7. Directory & File Structure](#7-directory--file-structure)
- [8. Application Bootstrap & Lifecycle](#8-application-bootstrap--lifecycle)
- [9. Graceful Shutdown & Signal Handling](#9-graceful-shutdown--signal-handling)
- [10. Dependency Injection & Service Container](#10-dependency-injection--service-container)
### PART III — THE MODULE SYSTEM

- [11. Module Anatomy & Manifest](#11-module-anatomy--manifest)
- [12. Building a Module — A Complete Worked Example](#12-building-a-module--a-complete-worked-example)
- [13. Module Tiers & Lifecycle](#13-module-tiers--lifecycle)
- [14. Inter-Module Communication](#14-inter-module-communication)
- [15. Swastik — Hot Reload & Dynamic Module Management](#15-swastik--hot-reload--dynamic-module-management)
- [16. Marketplace, MDIS & Extension System](#16-marketplace-mdis--extension-system)
### PART IV — REQUEST & INTERACTION LAYER

- [17. Command Framework & Routing Engine](#17-command-framework--routing-engine)
- [18. Event Architecture & Bus System](#18-event-architecture--bus-system)
- [19. Middleware Pipeline & Interceptors](#19-middleware-pipeline--interceptors)
- [20. Interaction & Component Handling](#20-interaction--component-handling)
- [21. Permission & Authorization Engine](#21-permission--authorization-engine)
- [22. Power Engine Panel, CLAI & Credentials Service](#22-power-engine-panel-clai--credentials-service)
### PART V — DATA & STATE

- [23. Configuration Management](#23-configuration-management)
- [24. Database Architecture](#24-database-architecture)
- [25. Caching Architecture](#25-caching-architecture)
- [26. State Externalization & Horizontal Scaling](#26-state-externalization--horizontal-scaling)
### PART VI — RELIABILITY & OPERATIONS

- [27. Observability — Logging, Metrics & Tracing](#27-observability--logging-metrics--tracing)
- [28. Error Management & Fault Tolerance](#28-error-management--fault-tolerance)
- [29. Job Queue & Scheduling](#29-job-queue--scheduling)
- [30. Localization & Internationalization](#30-localization--internationalization)
- [31. Analytics, Telemetry & MTP](#31-analytics-telemetry--mtp)
- [32. Security Architecture & Threat Model](#32-security-architecture--threat-model)
- [33. Performance & Scalability Engineering](#33-performance--scalability-engineering)
- [34. Privacy & GDPR Compliance](#34-privacy--gdpr-compliance)
- [35. Multi-Identity Operation — Twill & Personas](#35-multi-identity-operation--twill--personas)
### PART VII — MODULE CATALOG (ILLUSTRATIVE EXAMPLES)

- [36. Catalog Conventions & Illustrative Module Index](#36-catalog-conventions--illustrative-module-index)
### PART VIII — ENGINEERING LIFECYCLE

- [37. Testing Architecture & QA](#37-testing-architecture--qa)
- [38. Developer Experience & Tooling](#38-developer-experience--tooling)
- [39. Development Workflow](#39-development-workflow)
- [40. CI/CD Pipeline](#40-cicd-pipeline)
- [41. Infrastructure & Deployment](#41-infrastructure--deployment)
- [42. Versioning, Release & Migration](#42-versioning-release--migration)
- [43. Troubleshooting & Operational Runbooks](#43-troubleshooting--operational-runbooks)
### PART IX — REFERENCE

- [44. REST API, Webhooks & MDIS Reference](#44-rest-api-webhooks--mdis-reference)
- [45. Mandatory Feature Compliance Matrix](#45-mandatory-feature-compliance-matrix)
- [46. Dumby vs. Multipurpose Bots — Capability Comparison](#46-dumby-vs-multipurpose-bots--capability-comparison)
- [47. Glossary & Topic Index](#47-glossary--topic-index)
- [48. Appendices](#48-appendices)

---

## Acceptance
```acceptance
- id: ACC-ORI-0002-1
  check: "The table of contents lists exactly the parts/sections present in `spec/`"
  test: tests/docs/toc-parity.spec.ts
```
