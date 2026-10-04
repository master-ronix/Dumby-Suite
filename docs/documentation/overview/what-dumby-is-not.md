---
id: DOC-OVERVIEW-0005
title: 5. WHAT DUMBY IS NOT
kind: documentation
status: derived
version: 5.0.0
authority_scope: [5-what-dumby-is-not]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
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
