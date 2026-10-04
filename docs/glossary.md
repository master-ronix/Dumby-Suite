---
id: GLOSSARY
title: Glossary
kind: index
status: normative
version: 5.0.0
authority_scope: [terminology]
---

# Glossary

Single source of terminology (concept.md §16).

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

**Twill** — The persona system (formerly Twixter): Dumby's answer to bring-your-own-identity. A guild administrator supplies their own bot token and application; Dumby hosts the instance; one persona serves exactly one server. Twill runs on a free charter with an explicit sunset condition, and each Twill instance decides its own DM behavior — identity belongs to the guild, operation belongs to the platform.

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
