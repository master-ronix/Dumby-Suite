---
id: SPEC-CATALOG-0036
title: 36. Catalog Conventions & Illustrative Module Index
kind: spec
status: normative
version: 5.0.0
authority_scope: [catalog]
contracts: []
acceptance: [ACC-MOD-0036-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 36. Catalog Conventions & Illustrative Module Index

**Status:** [SPEC]

### 36.1 Why This Catalog Is Index-Depth by Design

This is a deliberately different kind of section from everything preceding it. Every
other Part in this reference specifies a *mechanism* — the bootstrap sequence, the
permission engine, the caching layer — completely, because a mechanism is something
every deployment shares regardless of which modules it happens to run. A module
catalog is different in kind: it is a list of the *sorts* of things module authors
build on top of those mechanisms, not a further layer of framework specification.
Fully designing all twenty-two entries below — their exact commands, their exact
schemas — would misrepresent this catalog as a second, competing specification
sitting alongside Part III's actual module contract, when its real purpose is
narrower: giving a reader a concrete sense of the *range* of what the tier system and
module contract are built to support, and a naming/categorization convention to follow
when adding a new one. §12's worked `reminders` example is the actual "how to build a
module" reference; this catalog is a map of the territory, not a second set of
blueprints.

### 36.2 Illustrative Module Index

```
TABLE 36-A — Twenty-Two Illustrative Modules by Tier

┌───┬────────────────────┬─────────────┬─────────────┬────────────────────────────┐
│ # │ Name │ Tier │ Marketplace │ One-Line Purpose │
│ │ │ │ Category │ │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 1 │ diagnostics-console │ admin │ — │ Owner-only live process │
│ │ │ │ │ introspection (memory, │
│ │ │ │ │ event-loop lag, DI state) │
│ 2 │ fleet-control │ admin │ — │ Discord-native wrapper over a │
│ │ │ │ │ curated subset of Power Engine's │
│ │ │ │ │ control domains (§22.3) │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 3 │ help │ core │ — │ Dynamically generated command │
│ │ │ │ │ reference, always current │
│ │ │ │ │ against the live registry │
│ 4 │ ping │ core │ — │ Gateway and API latency │
│ │ │ │ │ diagnostic │
│ 5 │ settings │ core │ — │ Guild-facing surface for │
│ │ │ │ │ guild_configs and module │
│ │ │ │ │ enable/disable state (§1.2's │
│ │ │ │ │ own running proof) │
│ 6 │ guild-info │ core │ — │ Server metadata, member count, │
│ │ │ │ │ boost tier, creation date │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│ 7 │ moderation │ standard │ — │ ban/kick/mute/warn/case │
│ │ │ │ │ management (§11–§12's shape) │
│ 8 │ welcome │ standard │ — │ Join/leave message composition │
│ 9 │ leveling │ standard │ — │ XP and rank tracking │
│10 │ logging │ standard │ — │ Configurable event-to-channel │
│ │ │ │ │ audit logging │
│11 │ auto-role │ standard │ — │ Role assignment on join │
│12 │ reaction-roles │ standard │ — │ Self-service role selection │
│13 │ birthdays │ standard │ — │ Scheduled birthday │
│ │ │ │ │ announcements │
│14 │ starboard │ standard │ — │ Cross-posting highly-reacted │
│ │ │ │ │ messages │
│15 │ anti-raid │ standard │ — │ Join-rate anomaly detection and │
│ │ │ │ │ temporary lockdown │
│16 │ giveaways │ standard │ — │ Timed entry/winner-selection │
│ │ │ │ │ events │
├───┼────────────────────┼─────────────┼─────────────┼────────────────────────────┤
│17 │ audio-playback │ marketplace │ audio │ Voice-channel music/audio │
│ │ │ │ │ playback │
│18 │ ticketing │ marketplace │ community │ Private support-channel workflow │
│19 │ economy │ marketplace │ community │ Virtual currency, shop, minigames │
│20 │ translate │ marketplace │ utility │ On-demand or reaction-triggered │
│ │ │ │ │ message translation │
│21 │ stream-alerts │ marketplace │ integrations │ Twitch/YouTube live-notification │
│ │ │ │ │ webhooks │
│22 │ verification │ marketplace │ security │ Captcha/rule-acknowledgment gate │
│ │ │ │ │ before full server access │
└───┴────────────────────┴─────────────┴─────────────┴────────────────────────────┘
```

None of the twenty-two rows above has a command surface, a schema, or an event
catalog defined by this reference — consistent with §36.1. Every one is a name, a
tier, and a one-line statement of intent, exactly deep enough to illustrate the tier
system's range and nothing deeper.

### 36.3 Using This Catalog When Designing a New Module

Three checks worth running against this table before starting a new module,
independent of which of the twenty-two names (if any) it resembles:

```
TABLE 36-B — Pre-Design Checklist

┌───┬───────────────────────────────────────────────────────────────────┐
│ 1 │ Does an honest reading of §13.3's tier co-constraints put this module │
│ │ where I expect? A moderation-adjacent idea that turns out to need no │
│ │ guild-level disable ever might actually be Core, not Standard. │
│ 2 │ Does this genuinely need to be a NEW module, or does it belong as a │
│ │ feature inside an existing one? A second leveling-adjacent idea might │
│ │ be a command added to #9 rather than module #23. │
│ 3 │ If this is Marketplace-tier, which of the five categories (§16.3) │
│ │ actually fits — and if none does comfortably, is this really │
│ │ Marketplace-appropriate, or does it belong at Standard tier instead? │
└───┴───────────────────────────────────────────────────────────────────┘
```

The worked example in §12 is the actual authoring reference once these three
questions are answered — this catalog's job ends at helping a module author place
their idea correctly within the tier and category system before they open their first
file.

## Acceptance
```acceptance
- id: ACC-MOD-0036-1
  check: "The module catalog is illustrative index-depth only; it asserts no required content for any catalog-listed module"
  test: tests/docs/catalog-index-depth.spec.ts
```
