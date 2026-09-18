# DUMBY

## Concept Documentation

### Ideology · Philosophy · Vision · Purpose · Audience

---

**Document type:** Concept Documentation — the foundational narrative and ideological reference for the Dumby project

**Project:** Dumby — Discord Unified Modular Bot System

**Classification:** Conceptual — defines what Dumby is, why it exists, who it serves, and the principles governing its existence

**Audience:** All stakeholders — guild operators, administrators, developers, partners, and internal teams

**Concept Documentation Version: 5.0.0 — Consolidated Re-Baseline (18/09/2026)**

---

## TABLE OF CONTENTS

- [1. Introduction](#1-introduction)
- [2. The Problem — Why Dumby Exists](#2-the-problem--why-dumby-exists)
- [3. The Philosophy](#3-the-philosophy)
- [4. What Dumby Is](#4-what-dumby-is)
- [5. What Dumby Is Not](#5-what-dumby-is-not)
- [6. The Unified Modular Doctrine](#6-the-unified-modular-doctrine)
- [7. Who Dumby Is For](#7-who-dumby-is-for)
- [8. The Developer Model](#8-the-developer-model)
- [9. Core Ideology — The Seven Pillars](#9-core-ideology--the-seven-pillars)
- [10. Engineering Philosophy](#10-engineering-philosophy)
- [11. Trust, Security & Reliability](#11-trust-security--reliability)
- [12. The Competitive Landscape](#12-the-competitive-landscape)
- [13. Vision Statement](#13-vision-statement)
- [14. Mission Statement](#14-mission-statement)
- [15. Closing](#15-closing)
- [16. Glossary of Program Terms](#16-glossary-of-program-terms)

---

---

## 1. INTRODUCTION

### 1.1 What This Document Is

This document is the conceptual foundation of Dumby. It is not a technical specification, an engineering reference, or an implementation guide. It is the answer to a different set of questions — the ones that come before architecture, before code, before the first module is ever written. Why does this product exist? What problem does it solve? Who does it serve? What does it believe in? What does it refuse to be?

Every architectural decision, every engineering trade-off, every feature priority in Dumby traces back to the ideas in this document. The technical references describe how Dumby works. This document explains why Dumby works the way it does.

### 1.2 One-Sentence Definition

Dumby is a closed-source product suite — a Discord unified modular bot system that is modular for users and guild members, unified for guild operators and administrators, and a complete system for developers.

### 1.3 The Name

Dumby is not an apology for simplicity. It is a deliberate inversion of the expectation that powerful software must be intimidating. The name signals approachability without compromising on depth. A guild member types a slash command and gets a clean, polished response. A guild administrator opens a dashboard and sees everything at a glance. A developer builds against a typed, validated, well-documented contract. None of them needs to think about the machinery underneath. The system is dumb so the people using it do not have to be smart about infrastructure — they can be smart about their communities instead.

---

---

## 2. THE PROBLEM — WHY DUMBY EXISTS

### 2.1 The Multipurpose Bot Trap

Discord has a category of bots called "multipurpose." The pitch is seductive: one bot, one invite, every feature a server could need — moderation, music, leveling, economy, tickets, welcome messages, logging. No juggling five different bots with five different dashboards, five different support servers, and five different uptime schedules.

The reality is different. A multipurpose bot is a monolith. Every feature shares the same codebase, the same development team, the same release cycle, and the same priority queue. When a guild needs better moderation tools, the development team is also working on the music player, the economy system, the ticket panel, and twelve other features. No single feature ever receives the focused attention, depth, or polish it deserves. The team ships breadth, not quality. Features are present but mediocre — functional enough to list on a feature page, not refined enough to be the best at what they do.

This is not a failure of intent. The developers of multipurpose bots are not lazy or incompetent. The problem is structural: a monolithic codebase with shared resources, shared priorities, and a single release cycle cannot produce premium quality across dozens of unrelated feature domains. The architecture itself prevents it.

### 2.2 The Consequence — Forced DIY

When a guild operator realises their multipurpose bot does a particular thing poorly — or does not do it at all — they face a choice. They can accept the limitation, or they can build their own bot.

Many choose to build. The Discord developer ecosystem makes the first hundred lines trivially easy: a `ready` event, a handful of slash commands, maybe a welcome message. The next ten thousand lines are where the project dies. Command logic becomes tangled with database calls. Feature flags become commented-out code blocks. The deploy process becomes "SSH in and restart the process and hope." The bot goes offline when the developer's laptop sleeps. There is no permission system beyond `if (member.permissions.has('Administrator'))`. There is no observability, no metrics, no tracing, no structured logging. There is no hot reload — every change is a full restart. There is no scaling story — the bot works for one guild and falls over at fifty.

The guild operator who started wanting one custom feature ends up maintaining an infrastructure project. The cost is not just time — it is focus, energy, and the opportunity cost of not building the community the bot was supposed to serve.

### 2.3 The Fragmentation Problem

The alternative to a multipurpose bot is a fleet of single-purpose bots: one for moderation, one for music, one for leveling, one for tickets. Each is presumably better at its one thing than the multipurpose bot is at any of its things. But the guild operator now manages five bots with five dashboards, five permission systems, five configuration surfaces, five sets of rate limits, five potential points of failure, and five support servers to contact when something breaks.

The experience for guild members is worse. Commands are scattered across bots with no consistent interface. Permission models differ — what "Moderator" means in one bot's permission system is not what it means in another's. A member who is a moderator in the moderation bot may not have the equivalent role in the logging bot. Configuration is duplicated — the welcome channel is set in the welcome bot, the log channel is set in the logging bot, the moderation log channel is set in the moderation bot, and none of them know about each other.

### 2.4 The Scale Problem

At large scale — hundreds of guilds, thousands of concurrent users, peak traffic during raids or events — most Discord bots degrade or fail. The bot process goes offline for a few seconds during a routine restart. A new version requires a full process restart, dropping every active interaction. A spike in concurrent button clicks overwhelms a single-threaded event handler. A raid floods the gateway with events faster than the bot can process them. The bot's database connection pool exhausts under load. The cache becomes a liability instead of an asset.

These are not edge cases for large communities. They are the normal operating conditions. A bot that cannot handle them is not a bot for large communities — it is a bot that happens to work in small ones until it does not.

### 2.5 The Trust Problem

For enterprise communities — businesses, brands, institutions, and large organisations operating on Discord — the bar is higher. A bot is not just a feature delivery mechanism. It is infrastructure that the community depends on. It must be reliable, secure, and trustworthy. It must not disappear when the developer loses interest. It must not break when Discord updates an API. It must not expose user data through a misconfigured permission or an unpatched vulnerability. It must have a support organisation behind it, not a single developer answering questions in their spare time.

Most Discord bots — multipurpose or single-purpose, open source or proprietary — do not meet this bar. They are hobby projects that grew. They are maintained by volunteers. They have no SLA, no accountability, no guarantee of continuity. An enterprise that builds its community workflow around such a bot is one developer's burnout away from a service interruption.

---

---

## 3. THE PHILOSOPHY

### 3.1 The Core Idea

Dumby exists to solve a philosophy, not just a feature gap.

The philosophy is this: a Discord bot should be one coherent product from the outside and N independently-owned, independently-developed, independently-deployable modules from the inside. No feature should be second-class because it shares a codebase with twenty other features. No guild should need to choose between the convenience of one bot and the quality of a purpose-built tool. No developer should need to build and maintain an entire bot framework to ship one feature.

The multipurpose bot solves breadth by sacrificing depth. The single-purpose bot solves depth by sacrificing coherence. Dumby solves both by refusing the trade-off: the unified surface gives guild operators one product to manage; the modular interior gives each feature the focused development attention it deserves.

### 3.2 The Three Audiences of the Word "Unified Modular"

Dumby is described as a "unified modular bot system." Each word in that phrase serves a different audience:

**Modular — for users and guild members.** A guild member does not see "modules." They see slash commands — `/ban`, `/play`, `/rank`, `/ticket`. Each command works independently, is developed independently, and can be enabled or disabled independently. If a guild does not want the economy module, it is turned off; the moderation module is unaffected. The modular architecture means features do not interfere with each other, fail together, or require each other to function. A guild member's experience is clean: the commands they see are the commands their guild has chosen to enable.

**Unified — for guild operators and administrators.** A guild administrator manages one bot, one dashboard, one permission system, one configuration surface, one set of rate limits, one deployment. They do not manage five bots with five dashboards and five permission models. When they enable a module, it inherits the guild's existing permission structure, rate-limit configuration, and logging setup. When they disable a module, its commands disappear and its event handlers stop — but the rest of the bot continues running uninterrupted. The unified surface means the operator's job scales with the number of features they want, not with the number of bots they have to manage.

**System — for developers.** A developer building a module for Dumby does not build a bot. They build a feature. The framework provides every piece of infrastructure — the Discord gateway connection, the dependency injection container, the event bus, the permission engine, the database layer, the caching layer, the job queue, the HTTP server, the logging and metrics and tracing pipeline, the configuration system, the hot-reload mechanism, the testing framework, the deployment pipeline. The developer provides the business logic: what the command does, what data it reads and writes, what events it subscribes to. The system handles everything else. This is what makes shipping the fortieth feature exactly as safe, fast, and well-tested as shipping the first.

### 3.3 The Refusal

Dumby's entire design reads as a simultaneous refusal of two failure modes:

**Refusal of the monolith.** Dumby refuses the idea that a bot must be one giant command handler where every file imports every other file and a shared `db.ts` sits at the centre of everything. In a monolith, disabling a feature requires a code change and a redeploy. A bug in one feature can crash the whole process. Parallel engineering is high-risk because every PR touches shared files. Dumby makes this failure mode structurally unavailable: every feature is a module with a declared contract, and modules interact only through typed, declared interfaces.

**Refusal of the plugin federation.** Dumby also refuses the idea that "modular" means a core that does almost nothing but load a folder of plugins, each reimplementing its own database connection, its own configuration loading, its own logger, its own permission model. A plugin federation looks modular on a directory listing but produces inconsistent behaviour, duplicated infrastructure, and no coherent operational surface. Dumby makes this failure mode structurally unavailable: every module consumes the same shared services, the same permission engine, the same event bus, the same configuration system — enforced by the framework, not by convention.

### 3.4 The Principle of No Self-Specialisation

The framework never special-cases itself. The commands that let a guild owner enable or disable features are themselves shipped as a module. The service that persists per-guild settings is a module. Moderation, welcome messages, logging configuration — all modules, loaded through the identical manifest contract, the identical DI container, the identical lifecycle hooks a third-party author would use.

This is what makes "unified" more than marketing language. The framework's own first-party behaviour is living proof that the module contract is sufficient for everything, because the framework itself is built on nothing else. If the contract were insufficient for some use case, the framework's own features would hit that limitation first — and since they do not, the contract is proven complete by construction.

---

---

## 4. WHAT DUMBY IS

### 4.1 Definition

Dumby is a closed-source product suite — a Discord unified modular bot system. It is a commercial product, not an open-source project. The framework, its core infrastructure, and its module ecosystem are developed and maintained by Dumby's development company. Modules are built exclusively by confirmed developers who are either hired by the company or licensed to develop for the platform.

### 4.2 What "Closed Source" Means Here

Dumby's source code is not publicly available. The framework, its infrastructure, and its core modules are proprietary. This is a deliberate choice, not an oversight:

- **Quality control.** A closed-source model ensures that every module shipped under the Dumby brand meets a consistent quality bar. No unreviewed, untested, or potentially malicious code enters the ecosystem through the front door.
- **Accountability.** When a guild operator installs a Dumby module, they know who built it, who reviewed it, and who is responsible if it breaks. There is no anonymous contributor who can abandon a module and leave guilds stranded.
- **Security.** The framework's internals — its permission engine, its database layer, its caching strategy, its deployment pipeline — are not exposed to attackers who could study them for vulnerabilities. Security through obscurity is not the primary defence, but it is a supplementary layer that closed-source provides.
- **Commercial sustainability.** Dumby is a product, not a hobby project. The development company invests in the framework's continued development, support, and infrastructure. A closed-source model enables the commercial structure that funds this investment.

### 4.3 Product Suite

Dumby is not a single bot. It is a product suite encompassing:

- **The bot itself** — the gateway-connected process that serves Discord interactions, runs modules, and provides the user-facing command surface.
- **The module ecosystem** — a curated catalog of modules developed by Dumby's company and licensed developers, covering moderation, community engagement, utility, entertainment, and integration categories.
- **The dashboard system** — the Discord-native Components V2 interface (`/dashboard`) and, where applicable, the MDIS web configuration surface for module settings.
- **The developer platform** — the infrastructure for module development, including the manifest contract, the DI container, the testing framework, and the Swastik deployment pipeline.
- **The operational surface** — the administrative tools, monitoring, and observability infrastructure that keeps the bot running at scale.

### 4.4 Technology Foundation

Dumby is built on TypeScript (strict mode), Node.js LTS, discord.js v14, PostgreSQL, Redis, BullMQ, and Fastify. These are not incidental choices — each was selected for specific engineering reasons documented in the technical references. The technology stack is an implementation detail of the philosophy: the types enforce contracts at compile time, the infrastructure externalises state for horizontal scaling, the middleware pipeline ensures every interaction passes through the permission engine, and the module system provides isolation boundaries that prevent cascading failures.

---

---

## 5. WHAT DUMBY IS NOT

Clarity about what Dumby is not is as important as clarity about what it is. Each exclusion is a deliberate boundary, not an oversight.

**Dumby is not an open-source project.** The source code is not publicly licensed, not community-contributed, and not freely forkable. Module development requires confirmation and licensing. This is a commercial product with a controlled ecosystem.

**Dumby is not a no-code bot builder.** Dumby is a code-first platform. Modules are written in TypeScript by developers who understand the framework's contract system. A module can expose a no-code-style configuration panel to guild admins (through the MDIS dashboard schema), but authoring a module itself is engineering work, not drag-and-drop assembly.

**Dumby is not a single-file script.** There is no supported mode where Dumby runs as one flat entry file. The module boundary is structural — it defines how the system is built, deployed, and operated, not a style preference a developer can opt out of.

**Dumby is not a "everything" clone.** Dumby does not ship every conceivable feature pre-enabled for every guild. The module catalog is curated. Each module is independently disableable. A guild gets the features it chooses, not a bloated default that includes things it does not need.

**Dumby is not a multi-framework abstraction layer.** Dumby commits to one Discord integration library (discord.js v14) and uses its types and event model directly. There is no lowest-common-denominator wrapper hiding the underlying SDK, because such wrappers sacrifice capability for portability that is not needed — Dumby runs on Discord, and it uses Discord's own types natively.

**Dumby is not a hobby project.** It is a product with a development company behind it, a commercial model, a support organisation, and a commitment to continuity. It is built for communities that depend on it, not for a developer's weekend experiment.

**Dumby is not a free-for-all marketplace.** Not everyone can build modules. Module development is restricted to confirmed developers who are either employed by Dumby's development company or have obtained a license. Every module passes through a review pipeline before it is available for installation. This is a curated ecosystem, not an app store with no gatekeeping.

---

---

## 6. THE UNIFIED MODULAR DOCTRINE

### 6.1 The Doctrine

The unified modular doctrine is the single governing idea from which every other decision in Dumby follows:

A bot should be **one coherent application** from the outside and **N independently-owned modules** from the inside, with a hard, tooling-enforced wall between "coherent" and "monolithic."

**Unified** means there is exactly one bootstrap sequence, one dependency graph, one event bus, one permission engine, one configuration system, and one operational surface, shared without exception by every feature the framework runs — including the framework's own administrative tooling, which ships as an ordinary module rather than as privileged, special-cased code.

**Modular** means every unit of behaviour is a self-contained, independently loadable, independently testable, independently disposable module with a declared contract for everything it needs and everything it exposes. A module owns its commands, its database tables, its event subscriptions, its jobs, its configuration schema, and its lifecycle. Nothing outside it reaches into that state without a declared, typed interface.

### 6.2 Why Both Words Matter

A system that is modular without being unified degenerates into a folder of loosely related plugins. Module 1 picks one logger; module 2 calls `console.log`; module 3 builds its own settings command because it never discovered a settings module already existed. Each plugin reimplements infrastructure that already exists, slightly differently, with slightly different bugs. The result looks modular on a directory listing but produces inconsistent behaviour across the feature surface.

A system that is unified without being modular degenerates into a monolith with feature flags standing in for real isolation. Every feature shares the same codebase, the same release cycle, and the same failure domain. Disabling a feature requires a code change. A bug in one feature can crash the whole process. Parallel engineering is high-collision because every PR touches shared files.

Dumby is engineered to make both failure modes structurally unavailable rather than merely discouraged. The application core enforces unification — there is exactly one instance of each core service per process, and no module ever constructs its own copy. The module contract enforces isolation — modules interact only through declared DI tokens, typed event subscriptions, and documented cross-module accessors, enforced by lint rules and compile-time type checking.

### 6.3 What the Doctrine Means in Practice

For a guild member: the commands they see are the commands their guild has enabled. Each command works independently. If the moderation module has a bug, the leveling module is unaffected. If the music module is disabled, the ticket module continues running.

For a guild operator: one bot, one dashboard, one permission system. When they enable a module, it inherits the guild's existing configuration. When they disable one, the rest continues. They manage features, not infrastructure.

For a developer: they write business logic, not infrastructure. The framework provides the Discord connection, the database, the cache, the event bus, the permission engine, the job queue, the logging, the metrics, the tracing, the configuration, the hot-reload, and the deployment pipeline. The developer provides what the module does — and nothing else.

---

---

## 7. WHO DUMBY IS FOR

### 7.1 The Universal Audience

Dumby is for all guild operators. Every Discord community, regardless of size, faces the same fundamental tension: the desire for feature breadth without sacrificing quality, and the desire for simplicity without sacrificing control. Dumby resolves this tension for every audience tier, but the way it resolves it shifts as a community grows.

### 7.2 Small Server Administrators

**Who they are:** Administrators of small Discord communities — a few hundred members, a handful of channels, a tight-knit group of people who know each other.

**What they seek:** Ease. They want to create a server fast and operate the whole community smoothly. They seek simplicity and tons of features at once. They are the audience that traditionally adds multipurpose bots because the appeal of "one bot does everything" is strongest when the administrator does not have the time or expertise to manage multiple bots.

**The problem they face:** Multipurpose bots are not designed for them. A multipurpose bot delivers features as required — present but not polished. The small server admin gets a bot that technically has moderation, music, leveling, and welcome messages, but none of them are particularly good. They are tired of adding multiple bots for different features, and the multipurpose bot they add to avoid that fragmentation does not satisfy their needs with quality.

**How Dumby serves them:** Dumby acts like a multipurpose bot for them — one bot, one invite, every feature available through the module catalog. But unlike a multipurpose bot, each feature is a purpose-built module developed with focused attention. The small server admin gets the convenience of "one bot" with the quality of "many purpose-built bots." They enable the modules they want, disable the ones they do not, and never think about infrastructure.

### 7.3 Medium Server Administrators

**Who they are:** Administrators of medium-sized Discord communities — a thousand to several thousand members, multiple channels and categories, active moderation teams, and growing complexity in their community management needs.

**What they seek:** Customisation and control. At this stage, they may need their own bot with different features that they cannot find in traditional bots. They cannot request features from multipurpose bot developers — those developers are working on the whole bot and will not prioritise one guild's specific need. So they try to make their own bot.

**The problem they face:** Building a custom bot is hard. It requires developing the codebase, managing and maintaining it, hosting and deploying it, keeping it updated, handling Discord API changes, managing database connections, implementing a permission system, building a logging pipeline — all for free, all on their own time, all with the risk that the developer loses interest and the bot rots. The cost is not just technical; it is the opportunity cost of not building the community the bot was supposed to serve.

**How Dumby serves them:** In Dumby, they do not need to pay for anything to get custom functionality. They make a private module — developed by themselves or by a licensed Dumby developer — and use it locally in their server. The module inherits all of Dumby's infrastructure: the permission engine, the database layer, the caching, the event bus, the deployment pipeline. They write the feature, not the framework. If the feature becomes valuable to other communities, they can get a license and make it commercial — available to other guilds through the Dumby marketplace. The path from "I need this one custom thing" to "I am selling this feature to other communities" is a single licensing step, not a product rebuild.

### 7.4 Large Scale or Massive Community Administrators

**Who they are:** Administrators of large or massive Discord communities — tens of thousands of members, hundreds of concurrent users during peak hours, multiple moderation teams, high-traffic events, and the constant threat of raids, spam, and abuse.

**What they seek:** Reliability, scale, and resilience. They need a bot that does not go offline. They need updates that do not require a full restart. They need infrastructure that handles hundreds of people clicking the same button at the same time, joining and leaving voice channels in seconds, and flooding the gateway with events during a raid.

**The problem they face:** Most Discord bots get offline for a few seconds during routine restarts. They have regular outages. They cannot update without a complete restart, which drops every active interaction. They cannot handle the scale of huge traffic — a single-threaded event handler bottlenecking on concurrent interactions, a database connection pool exhausting under load, a cache that becomes stale or inconsistent. During a raid, the bot either falls behind on event processing or crashes entirely.

**How Dumby serves them:** Dumby provides zero-downtime updates through the Swastik hot-reload system — modules are unloaded and reloaded at runtime without restarting the bot process. State is externalised to PostgreSQL and Redis, so the bot process is stateless and horizontally scalable — multiple instances share the same database and cache, and any instance can handle any interaction. The middleware pipeline processes every interaction through the permission engine, rate limiter, and input validator before the handler runs — protecting the bot from abuse even under load. The error containment model ensures one module's failure degrades only that module's capability, never cascading to crash the process. Dumby is built to handle any load or traffic in any form. It is always ready.

### 7.5 Enterprise Community Administrators

**Who they are:** Administrators of enterprise Discord communities — businesses, brands, institutions, and large organisations that use Discord as a operational platform. Their community is not a hobby; it is infrastructure. Downtime costs money. Data exposure costs trust. Instability costs reputation.

**What they seek:** A secured, reliable, trusted, credible product for their community — one that will never discontinue. They need better community support. They have brand value to protect. They need a bot which will never get broken and never slow down.

**The problem they face:** Enterprise communities cannot depend on hobby projects. They cannot depend on a bot maintained by a single volunteer who may lose interest. They cannot depend on an open-source project that may be abandoned. They cannot depend on a bot with no SLA, no accountability, and no guarantee of continuity. They need a product with a company behind it — one that is commercially incentivised to maintain, support, and improve the bot indefinitely.

**How Dumby serves them:** Dumby is a closed-source commercial product suite developed by a company with a vested interest in its continued success. It provides enterprise-grade reliability through its stateless, horizontally scalable architecture. It provides security through its seven-layer permission engine, its input sanitisation, its output encoding, its resource quota enforcement, and its defence-in-depth strategy. It provides credibility through its controlled developer ecosystem — every module is reviewed, signed, and accountable. It provides continuity through its commercial model — the development company is incentivised to maintain and support the product for as long as customers depend on it. It provides support through its organisational structure — a company that can be contacted, that has a stake in resolving issues, and that will not disappear when a single developer moves on.

### 7.6 Audience Summary

| Audience | Core Need | How Dumby Delivers |
|---|---|---|
| Small server admins | Simplicity + features, fast setup | One bot, one invite, curated module catalog — acts like a multipurpose bot but with purpose-built quality per feature |
| Medium server admins | Customisation without infrastructure burden | Private modules using Dumby's full framework; path to commercial licensing without rebuilding |
| Large scale communities | Reliability, scale, zero downtime | Stateless horizontal scaling, Swastik hot-reload, per-handler fault containment, externalised state |
| Enterprise communities | Trust, security, continuity, support | Closed-source commercial product, controlled developer ecosystem, defence-in-depth security, company-backed support |

---

---

## 8. THE DEVELOPER MODEL

### 8.1 Controlled Ecosystem

Dumby is not an open marketplace where anyone can publish a module. Module development is restricted to confirmed developers who meet one of two criteria:

1. **Hired developers** — developers employed by Dumby's development company. They build first-party modules as part of the Dumby team, with full access to the framework's internals, its development pipeline, and its review process.

2. **Licensed developers** — independent developers or organisations who have obtained a license to develop modules for the Dumby platform. They build third-party modules under the Dumby module contract, subject to the same review pipeline, security gates, and quality standards as first-party modules.

### 8.2 Why Not Open Development

The decision to restrict module development is a direct consequence of Dumby's philosophy. A controlled developer ecosystem is what makes the quality guarantee possible:

- **Quality bar.** Every module in the Dumby catalog meets the same engineering standard — typed contracts, validated manifests, reviewed code, sandboxed execution, resource quotas. An open marketplace where anyone can publish without review cannot maintain this bar.
- **Security.** A module running inside Dumby has access to shared infrastructure — the database, the cache, the event bus, the permission engine. An unreviewed module could exfiltrate data, escalate privileges, or consume unbounded resources. The review pipeline — manifest validation, security review, sandboxed execution, dependency audit, resource quota testing — exists because modules are not isolated app-store apps running in a sandbox; they are code running inside a shared process.
- **Accountability.** When a guild operator installs a Dumby module, they know who built it, who reviewed it, and who is responsible. A licensed developer is bound by their licensing agreement to maintain their module, respond to security reports, and fix critical bugs. An anonymous contributor has no such obligation.
- **Commercial model.** Dumby's development company invests in the framework, the infrastructure, the review pipeline, and the support organisation. The licensing model funds this investment. An open, free marketplace does not sustain a commercial product.

### 8.3 The Developer Experience

For developers who are confirmed and licensed, the Dumby development experience is designed to be the best in the Discord bot ecosystem:

- **Write features, not infrastructure.** The developer provides business logic. The framework provides everything else — the Discord connection, the database, the cache, the event bus, the permission engine, the job queue, the HTTP server, the logging, the metrics, the tracing, the configuration system, the hot-reload mechanism, the testing framework, and the deployment pipeline.
- **Typed contracts.** Every module declares a manifest validated against a strict Zod schema. Every cross-module interaction happens through typed DI tokens. Every event subscription has a documented payload shape. The TypeScript compiler catches integration bugs at authoring time, before a test runs.
- **Progressive disclosure.** A developer's first module touches one file, one interface. A stateful, job-scheduling, cache-backed module has the whole framework available. The simple case is simple; the complex case is supported. Nothing is forced on the developer until they need it.
- **Swastik deployment pipeline.** Modules are uploaded, validated, sandboxed, staged, and promoted through an automated pipeline. The developer supplies the module package; everything else — manifest extraction, identity validation, license check, security review, staging, promotion, and hot-swap signalling — happens without further input.
- **Private modules.** A developer can build a module for their own guild without publishing it to the marketplace. A private module passes every validation and promotion step exactly as a public module does — it simply never appears in the browsable catalog until the developer chooses to publish it.

### 8.4 The Licensing Path

A medium server administrator who builds a private module for their own community has a clear path to commercialisation:

1. **Build privately.** The module is developed against the Dumby contract, validated, and deployed to the developer's own guild. It is not visible to other communities.
2. **Apply for a license.** The developer applies to Dumby's development company for a module development license. The application includes the module, its manifest, and its intended use case.
3. **Review and approval.** The module passes through the five-gate review pipeline: manifest validation, automated security scan, manual security review, resource quota sandboxed execution, and cryptographic signing.
4. **Publication.** Once approved and signed, the module is published to the Dumby marketplace catalog. It becomes available for installation by any guild.
5. **Commercial terms.** The licensing agreement between the developer and Dumby's company defines the commercial terms — revenue share, support obligations, maintenance requirements, and the developer's ongoing responsibilities.

The path from "I needed this one custom thing" to "I am selling this feature to other communities" does not require rebuilding the module as a standalone bot, finding hosting, building a payment system, or establishing a support organisation. It requires passing the review pipeline and signing a license. Everything else — hosting, scaling, deployment, billing infrastructure — is provided by Dumby.

---

---

## 9. CORE IDEOLOGY — THE SEVEN PILLARS

These are the standing principles that govern every decision in Dumby — architecture, development, operations, and product strategy. Every feature, every trade-off, every exclusion traces back to one or more of these pillars.

### Pillar 1 — Module Sovereignty

A module owns its commands, its database tables, its event subscriptions, its jobs, its configuration schema, and its lifecycle outright. Nothing outside it reaches into that state without a declared, typed interface. This is what makes a module independently developable, independently testable, and independently disposable. A module can be rewritten from zero without any other module or the core knowing — as long as it honours its declared contract.

### Pillar 2 — Contract Over Convention

Cross-module interaction happens through manifests, typed DI tokens, and a documented event catalog — never by importing another module's files or guessing its table names. Convention says "you should do it this way." Contract says "you cannot do it any other way." Dumby uses contracts because conventions degrade under pressure — a deadline approaches, a developer takes a shortcut, and the convention is violated. A contract enforced by the compiler and the build system cannot be violated without the build failing.

### Pillar 3 — Fail Fast, Degrade Gracefully

Misconfiguration is caught at boot — the process refuses to start half-broken. Once live, one module's failure degrades only the capability it owned — never cascading to crash the process or affect other modules. A moderation module that throws an error disables itself; the leveling module, the music module, and the ticket module continue running. The error is logged, the module is marked as in error state, and the administrator is notified. The system does not pretend the failure did not happen, but it does not let it spread.

### Pillar 4 — Observability by Default

Every command, every job, and every lifecycle transition emits structured logs, metrics, and trace spans without hand-written instrumentation. A developer does not need to remember to add logging — the framework wraps every handler, every job, and every event subscription automatically. This is what makes Dumby operable at scale: when something goes wrong in a deployment serving hundreds of guilds, the operator can find the problem through metrics and traces rather than through guesswork.

### Pillar 5 — One Operational Surface

One Dockerfile, one health endpoint, one metrics endpoint, one config loader, one migration runner — regardless of module count. A deployment with forty modules has the same operational surface as a deployment with four. The operator does not learn a new monitoring interface for each module, because there is one. The operator does not run a different migration command for each module, because there is one migration runner that handles every module's migrations in declaration order. This is what makes Dumby unified in practice, not just in theory.

### Pillar 6 — TypeScript as Design Material

The module contract, the DI container, the event bus, and the command interface are defined so that a whole class of integration bug is rejected at compile time — before a test even runs. TypeScript strict mode is not a preference; it is the production stack. The manifest schema, the command class interface, the event catalog, and the repository layer are all defined using TypeScript types and generics in ways that let the compiler catch the bugs that would otherwise be discovered at runtime, in production, at 3 AM.

### Pillar 7 — Progressive Disclosure

A first command touches one file and one interface. A stateful, job-scheduling, cache-backed module has the whole framework available — nothing forced on the simple case. A developer writes the minimal manifest first and adds commands, events, jobs, and configuration schema only as the module grows. The framework provides a template module that is the smallest correct starting point, and the manifest supports progressive field addition. This is what makes Dumby accessible to developers building their first module while not limiting what they can build as they grow.

---

---

## 10. ENGINEERING PHILOSOPHY

### 10.1 Explicit Over Implicit

Nothing is auto-detected by filename magic where a manifest field could say it explicitly. A command is a command because the manifest lists it, not because it lives in a folder named `commands/`. The manifest is a complete table of contents for a module without opening a second file. This principle eliminates an entire category of bug: the "it worked when I named the file correctly" class of failure.

### 10.2 Configuration Without Code

Anything an operator or guild administrator should reasonably change — a threshold, a channel ID, a currency name, a cooldown — is a configuration value, validated against a typed schema, never a constant requiring a code change and a redeploy. Configuration is per-guild, hot-reloadable, and validated against the module's Zod schema at write time. A guild admin changes a setting through the dashboard; the module's `onConfigChange` hook fires; the module reacts immediately. No restart. No redeploy.

### 10.3 Freedom by Default, Authority by Exception

Modules are free to act without asking, and the framework grants authority only through explicit, declared exceptions — never by default. A module is loaded, its commands are registered, its events are subscribed, and it begins operating. The framework does not require the module to request permission to function. Permission restrictions — rate limits, RBAC roles, blacklists — are exceptions layered on top of the default-allow posture, declared explicitly in the manifest or configured by the guild administrator.

### 10.4 Isolation Through Structure, Not Discipline

Module isolation is enforced by the build itself failing, not by reviewer discipline. ESLint rules prevent cross-module imports. Zod schema namespacing prevents configuration key collisions. The DI container prevents modules from accessing services they have not declared as dependencies. The ServiceLocator's tier-based access control prevents Marketplace modules from accessing Admin-tier services. These are not guidelines that rely on developers remembering to follow them — they are structural enforcement mechanisms that make violation impossible without changing the build configuration.

### 10.5 Security Built In, Not Bolted On

Security is built into the framework, not added as an afterthought. Input sanitisation is automatic — the InputSanitizer runs on every interaction. Output encoding is automatic — the ResponseBuilder encodes user content. Authentication is required for all web endpoints. Authorisation is enforced by the seven-layer permission resolution engine. Secrets are managed by the SecretsManager and are never exposed to modules. The Module Gateway verifies third-party modules before they are available for installation. The defence-in-depth strategy ensures that multiple security layers protect against different threat vectors — there is no single gate whose failure opens everything.

### 10.6 Production-Grade by Construction

Dumby is not a prototype that might grow into a production system. It is designed from the first commit for production deployment: stateless processes, externalised state, horizontal scaling, zero-downtime updates, structured logging, distributed tracing, metrics collection, circuit breakers, retry policies, dead-letter queues, and graceful shutdown. A single-server operator running one process benefits from the same architectural guarantees as a multi-region deployment serving tens of thousands of guilds — the guarantees are structural, not optional add-ons that a small deployment can skip.

---

---

## 11. TRUST, SECURITY & RELIABILITY

### 11.1 The Trust Stack

Trust in Dumby is built on four layers, each reinforcing the others:

**Provenance trust.** Every module has a known developer — either hired by Dumby's company or licensed through a formal agreement. Every module version has a `devId` and `buildId` pair validated at load time. Every module is cryptographically signed after passing the review pipeline. A guild operator can trace any module back to the developer who built it and the review that approved it.

**Architectural trust.** The module contract, the DI container, and the lint rules enforce isolation boundaries that prevent a module from accessing another module's data, infrastructure, or internals — even if the module is malicious. The ServiceLocator's tier-based access control ensures that Marketplace modules receive quota-enforcing wrappers around every service, preventing unbounded resource consumption. The seven-layer permission engine ensures that every interaction is authorised before it reaches the handler.

**Operational trust.** The framework's observability infrastructure — structured logging, Prometheus metrics, OpenTelemetry tracing — means that every action is recorded, every error is logged, and every performance issue is traceable. The audit log table records every administrative action with actor, source, reason, and timestamp. An operator can answer "who did what, when, and why" for any change in the system.

**Commercial trust.** Dumby is a product backed by a company. The company has a commercial interest in maintaining the product, fixing bugs, responding to security reports, and providing support. This is the trust layer that open-source projects and hobby bots cannot provide — the assurance that someone is accountable and incentivised to keep the system running.

### 11.2 Reliability Engineering

Dumby's reliability is engineered, not hoped for:

- **Per-handler fault containment.** A throwing handler is caught by the module's error boundary. The module is marked as in error state. Other modules and the core continue running. For Marketplace modules, automatic per-guild disablement triggers after 10 errors in 60 seconds — protecting the guild from a repeatedly failing module.
- **Graceful shutdown.** Signal handling (SIGTERM, SIGINT) triggers an ordered shutdown: stop accepting new interactions, finish in-flight requests, flush logs, close database connections, close Redis connections, disconnect from the gateway. No data loss, no orphaned connections.
- **State externalisation.** No cross-process state lives anywhere except PostgreSQL (system of record) and Redis (acceleration and coordination). A process crash is not a data-loss event — the state is in the database, and a new process picks up where the old one left off.
- **Zero-downtime updates.** The Swastik hot-reload system unloads and reloads modules at runtime without restarting the process. A module update takes effect immediately — no restart, no dropped interactions, no downtime.
- **Horizontal scaling.** Multiple bot processes share the same PostgreSQL and Redis infrastructure. Any process can handle any interaction. Load is distributed across processes. A process failure is handled by the orchestrator (Kubernetes), which spins up a replacement.

### 11.3 The Permission Engine

The seven-layer permission resolution engine is the single source of truth for authorisation across the entire feature surface:

1. **Bot Owner Override** — the user is identified in `BOT_OWNER_IDS`; access granted unconditionally. This is an operator override, not a rank.
2. **Blacklist Check** — the user or guild is on a blacklist; access denied.
3. **Guild/Module Availability** — the module is enabled in this guild; if not, access denied.
4. **Channel Restriction** — the command is allowed in this channel; if not, access denied.
5. **Discord Native Permission** — the user has the required Discord permission bits; if not, access denied.
6. **RBAC Role** — the user's Dumby rank (OWNER/ADMINISTRATOR/MODERATOR/HELPER/MEMBER/RESTRICTED) grants access; if not, access denied. OWNER here is the guild's ownership account — distinct from the bot-owner override in Layer 1, which is not a rank.
7. **Explicit Grant Override** — a Layer 7 override (permit, whitelist, blacklist, cooldown, rate-limit) applies; this is the final arbiter.

No command handler implements any permission logic of its own. All authorisation logic lives exclusively in the resolver or in the middleware that calls it. This means permission policy is consistent across every module — there is one permission model, not N models that happen to agree most of the time.

---

---

## 12. THE COMPETITIVE LANDSCAPE

### 12.1 Dumby vs. Multipurpose Bots

| Dimension | Multipurpose Bot | Dumby |
|---|---|---|
| Feature quality | Breadth over depth; every feature shares the same development priority, so none receives focused attention | Each feature is a purpose-built module developed with focused attention; the module system enforces isolation so each feature is developed, tested, and deployed independently |
| Disabling a feature | Code change and redeploy — or not possible at all | One per-guild state flip; no code change, no redeploy |
| Failure blast radius | One feature's bug can crash the whole process | Per-handler isolation; a failed module disables itself alone |
| Permission model | Re-implemented per command, inconsistently | One seven-layer resolver, one source of truth |
| Parallel engineering | High collision risk on shared files | Zero collision risk — modules share no files |
| Database ownership | One shared schema; any command queries any table | Each module owns its tables exclusively |
| Update mechanism | Full process restart, dropping active interactions | Zero-downtime hot-reload per module |

### 12.2 Dumby vs. Single-Purpose Bots

| Dimension | Fleet of Single-Purpose Bots | Dumby |
|---|---|---|
| Management overhead | N bots, N dashboards, N permission systems, N configuration surfaces | One bot, one dashboard, one permission system, one configuration surface |
| Consistency | Each bot has its own permission model, its own logging, its own rate limits | Every feature shares the same permission engine, logging pipeline, and rate-limit infrastructure |
| Failure surface | N independent points of failure | One process with per-module fault containment |
| Infrastructure cost | N processes, N database connections, N memory footprints | One process, one database connection pool, one memory footprint shared across modules |

### 12.3 Dumby vs. Custom Bots

| Dimension | Custom Bot | Dumby |
|---|---|---|
| Development effort | Build the entire framework — Discord connection, database, cache, permissions, logging, deployment — from scratch | Build only the feature; the framework provides everything else |
| Maintenance burden | The guild operator maintains the codebase, hosting, deployment, and updates indefinitely | The framework and infrastructure are maintained by Dumby's company; the developer maintains only their module's business logic |
| Scaling story | Works for one guild; falls over at scale | Horizontally scalable from day one; state externalised to PostgreSQL and Redis |
| Quality bar | Depends entirely on the developer's expertise and available time | Enforced by the manifest contract, the review pipeline, and the framework's typed interfaces |
| Commercial path | None — a custom bot serves one guild | License the module, publish to the marketplace, earn revenue from other guilds |

### 12.4 What Makes Dumby Different

The single thing that no multipurpose bot, no fleet of single-purpose bots, and no custom bot can offer is the combination of:

1. **One coherent product** from the operator's perspective (unified).
2. **Independently developed, independently deployed, independently disposable features** from the developer's perspective (modular).
3. **A controlled, reviewed, accountable module ecosystem** that guarantees quality and security (closed-source, licensed).
4. **A commercial product backed by a company** that is incentivised to maintain, support, and improve it indefinitely (enterprise-grade).

No competitor offers all four. Multipurpose bots offer (1) but not (2). Single-purpose bots offer (2) but not (1). Custom bots offer neither (3) nor (4). Dumby offers all four simultaneously, by construction.

---

---

## 13. VISION STATEMENT

A guild's bot should present as one coherent product with one settings surface — never a federation of plugins an operator has to remember six unrelated environment variables for. The engineering team behind it, meanwhile, should experience a set of independently-shippable codebases that never block on each other, never break each other, and can each be rewritten from zero without anyone else noticing.

Dumby's vision is a Discord where every community — from a twenty-person friend group to a hundred-thousand-member enterprise server — runs on infrastructure that is reliable by default, secure by construction, and extensible without rebuilding. Where a guild operator never has to choose between convenience and quality. Where a developer never has to build a framework to ship a feature. Where a feature is never second-class because it shares a codebase with twenty others.

Dumby is the product that makes that Discord real.

---

---

## 14. MISSION STATEMENT

Dumby's mission is to provide a closed-source, unified modular bot system in which shipping the fortieth feature is exactly as safe, fast, and well-tested as shipping the first — by making isolation, typed contracts, and observability the default path, not something a disciplined team must remember to bolt on.

Dumby serves all guild operators — from small servers seeking simplicity and breadth, to medium communities seeking customisation without infrastructure burden, to large-scale communities demanding reliability and zero downtime, to enterprise organisations requiring trust, security, and continuity. For each audience, Dumby delivers the same architectural guarantees through a surface calibrated to their needs.

Dumby's developer model — confirmed, licensed developers building against a typed, validated, reviewed contract — ensures that every module in the ecosystem meets a consistent quality bar, is accountable to a named developer, and is backed by a commercial entity with a vested interest in its continued quality.

Dumby is not a hobby project. It is not an experiment. It is not a feature list on a website. It is a product — engineered, maintained, supported, and built to last as long as communities depend on it.

---

---

## 15. CLOSING

Dumby began with a simple observation: the Discord bot ecosystem forces every community to make a trade-off that should not exist. Convenience or quality. Simplicity or control. Breadth or depth. One bot that does everything poorly, or many bots that do one thing well but do not talk to each other.

Dumby refuses that trade-off. Not by finding a middle ground between the two failure modes, but by building a structure that makes both failure modes unavailable. The unified core prevents the fragmentation of plugin federations. The module contract prevents the entanglement of monoliths. The controlled developer ecosystem prevents the quality erosion of open marketplaces. The commercial model prevents the abandonment of hobby projects.

The result is a product that is one thing from the outside and many things from the inside — coherent for the operator, modular for the developer, reliable for the large community, and trustworthy for the enterprise.

That is Dumby.

---

---

## 16. GLOSSARY OF PROGRAM TERMS

Dumby's narrative vocabulary is deliberately plain — guild, module, contract, tier. But a program of this scope also grows a working vocabulary of named concepts, the terms that appear wherever the philosophy meets the machinery. This section defines those terms at the conceptual level: what each means, why it exists, and what it protects. Engineering detail lives in the technical references; where an entry benefits from a pointer, it says so. The definitions below are the canonical ones — where an older document disagrees, this glossary and the 5.0.0 technical baseline win.

**Renderer** — The core-owned presentation authority: every user-facing surface in Dumby is issued by it, and no module ever hand-assembles what a member sees. It speaks a single static Components v2 grammar — frames, dividers, title and subtitle, footer — filled through dynamic slots for accent, banner, module identity, and content. Module authors declare schemas that say what their data means; the renderer derives how it is presented. One visual language, owned by the core, guaranteed across every feature in every guild (see interface.md 5.0.0).

**Buffer (buffer embed)** — The instant embed sent the moment an interaction arrives, before any real work has begun. It is then edited in place — into the final render on success, or into a formal notice frame when the interaction cannot be completed. The principle it enforces is small and absolute: no interaction is ever left unanswered, whether the module behind it is slow, failing, or absent.

**Formal notice frame** — When an interaction cannot end in a rendered result, it ends in a formal notice frame — the renderer's unified presentation for failures, maintenance windows, and unknown commands. Every notice carries a machine-readable reason code and a trace correlation ID, so even a refusal is precise, consistent, and diagnosable. There are no ad-hoc error messages in Dumby; there is a grammar for telling the truth gracefully.

**Mode D/M/C** — Every renderer page honors the three density modes — detailed, medium, and compact. The same content renders at the depth the reader chooses: everything for the administrator who wants the full picture, the essentials for the member who wants the headline. Density is a property of the reader, not of the feature, so it applies uniformly across the whole surface.

**Edit-in-place navigation** — The invariant that navigation edits one message in place rather than posting new ones. Moving through a dashboard, a catalog, or a queue never floods a channel with superseded responses; the surface a member is looking at simply becomes the surface they asked for. The interface remembers where it is, so the conversation stays clean.

**Core Command Surface** — The reference implementation set of renderer-issued commands: `/dashboard`, `/health`, `/browse`, `/queue`, `/persona`, `/permit`, `/modules`, and `/hello`. They are the core's own front door — the proof, in working commands, of what the renderer grammar and the module contract can express. Every renderer page in the ecosystem is measured against them.

**`swastik` package** — The versioned, standalone module-authoring SDK: the types, schemas, and scoped entry points a developer writes against. It is the only supported import surface for module authors — everything beyond its boundaries is core territory, not module territory. Because the SDK is versioned, the authoring experience moves deliberately, and the Compatibility Ledger decides when.

**Global Data Emit** — The fifth sanctioned cross-module pattern: durable, schema'd public datasets exposed through a read and aggregate API. A module publishes information once; authorised consumers read it without the publisher owning or knowing the reader. It is how the ecosystem shares knowledge without sharing codebases.

**Twixter** — The persona system (formerly Twill): Dumby's answer to bring-your-own-identity. A guild administrator supplies their own bot token and application; Dumby hosts the instance; one persona serves exactly one server. Twixter runs on a free charter with an explicit sunset condition, and each Twixter instance decides its own DM behavior — identity belongs to the guild, operation belongs to the platform.

**Release Manager** — The release-management subsystem. Deployments are triggered from the repository, captured as Deployment Records, and the reverse GitHub sync commits system changes back to the Git system-of-record. Deployment in Dumby is not a ritual performed over SSH in the dark; it is an event with a provenance trail that begins and ends in version control.

**License state machine** — The licensing regime for module developers: six states — pending → under-review → approved → suspended ⇄ restored → revoked. Licenses are devId-bound and tier-differentiated, anchored in paper certificates carrying verifiable license IDs. Suspension is recoverable through restoration; revocation is terminal. A developer's standing is never a matter of opinion — it is a state with a history.

**Tier volumes** — The four per-tier module storage volumes — admin, core, standard, and marketplace — plus staging. Together they replace in-tree module storage: a module lives in the volume its tier earns, tier is enforced at rest, and staging is seeded through promotion rather than direct placement. Where code lives is a statement about the trust it carries.

**Compatibility Ledger** — The machine-readable registry of every cross-boundary contract's supported version window. It is the arbiter that gates core releases and module deployments: when a change would break a contract window, the change does not proceed until the ledger is satisfied. Evolution without breakage is a policy, and the ledger is where that policy is written down.

**Trusted builder (Gate 1 runner)** — The planned Gate 1 runner: an isolated, network-restricted compilation environment in which raw TypeScript module uploads will be compiled before anything else trusts them. It is deferred greenfield work — planned, not yet specified as a shipped capability — and this glossary records its intent honestly rather than implying it exists. When it arrives, it will close the gap between uploaded and trusted at the pipeline's front gate.

**Visibility** — The first-class manifest enum — public, unlisted, or private — that declares who may discover a module. It is co-constrained with tier and with the hardcode toggle: the three together determine where a module can live and who can see it. A module's audience is a declared fact, not an accident of publication.

**Hardcoded module** — A module pinned permanently to a single guild through `hardcoded: true` and a `hardcodeGuildId` in its manifest. Hardcoding requires private visibility and brings guild-scoped command registration: a deliberate, permanent marriage between one feature and one community, recorded where it cannot be quietly undone.

**Deployment Record** — The durable account of each repository-triggered deployment — who triggered it, what was deployed, when, and the verdict. Records are queryable end-to-end, so the question of what changed, and who changed it, always has an answer, from the commit to the running process.

**Envelope encryption** — The layered key scheme protecting credentials the system must read in-process and must be able to recover: a root key wraps data-encryption-keys, which wrap per-record AES-256-GCM payloads. It is deliberately distinct from Argon2id one-way hashing, which protects secrets that must never be recoverable. Recovery for the machine, irreversibility for the member.

### 16.1 RBAC Vocabulary — Layers 6 and 7

The seven-layer permission engine has a working vocabulary of its own, concentrated in its last two layers. It is recorded here because the words matter: ranks and grants are the grammar in which a guild expresses who may do what (see blueprint.md 5.0.0 §21).

**Layer 6 — the rank function.** Layer 6 is a pure backend rank function: it is evaluated, never written. A member's rank is computed from live guild state at request time and persisted nowhere, so it can never silently disagree with the guild it describes. The six-rank ladder, from strongest to weakest: **OWNER > ADMINISTRATOR > MODERATOR > HELPER > MEMBER > RESTRICTED** — and MODERATOR and ADMINISTRATOR are the canonical rank names, used consistently across every Dumby surface. **OWNER** is the guild's ownership account — a fact of the guild, not a grant, and distinct from the Layer 1 bot-owner override (`BOT_OWNER_IDS`), which is an operator identity and not a rank at all. **RESTRICTED** is the floor of the ladder: no member resolves below it, and no grant can push a member beneath it.

**Layer 7 — guild-side grants.** Layer 7 is where a guild expresses exceptions in its own vocabulary: grants of types permit, whitelist, blacklist, cooldown, and rate-limit, scoped to module commands only. Grants attach at three scopes, from coarsest to finest: **role**, then **group**, then **set** — where a set is a set of groups. When more than one grant applies, the most specific scope wins: a set-level grant outranks a group-level grant, which outranks a role-level grant.

**The override boundary.** Layer 7 grants are powerful, but they are not sovereign. Layers 1–3 — the bot-owner override, the blacklist, and guild/module availability — the bot-capability check, and the RESTRICTED floor can never be overridden by any grant. Whatever a guild's grants say, they cannot unlock what the system itself refuses, cannot un-bar what the platform has blacklisted, and cannot demote a member below RESTRICTED.

---

*End of Dumby Concept Documentation*
