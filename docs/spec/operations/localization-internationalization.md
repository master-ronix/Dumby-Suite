---
id: SPEC-06-OPERATIONS-0030
title: 30. Localization & Internationalization
kind: spec
status: normative
version: 5.0.0
authority_scope: [06-operations]
anchors: [LOCALIZATION_INTERNATIONALIZATION, LOCALE_RESOLUTION_ORDER, TRANSLATION_CATALOG_STRUCTURE, RIGHT_TO_LEFT_LANGUAGE, TIMEZONE_FORMATTING, CONTRACT, ACCEPTANCE, EDGES_BLUEPRINT]
contracts: [contracts/errors.json]
acceptance: [ACC-OPS-0030-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## 30. Localization & Internationalization

**Status:** [SPEC]

### 30.1 Locale Resolution Order

The locale middleware (priority 30) resolves the context locale through a fixed precedence,
evaluated once per interaction:

1. The guild config's explicit locale — an admin's deliberate choice always wins when present.
2. Discord's own interaction locale hint (the invoking user's client language).
3. The deployment default — `en-US`.

### 30.2 Translation Catalog Structure

Every module ships its own locale directory, with `en-US.json` **mandatory** — Stage 11
validation fails a module missing it (English is the deployment default and the fallback of
last resort). The i18n manager merges every module's locale files into one global catalogue,
namespaced by module name so two modules can use the same short key (`error.not-found`)
without colliding. A key missing in the resolved locale falls back to `en-US` **for that key
specifically** — a partially-translated locale degrades key by key, never an all-or-nothing
swap.

```
CODE REFERENCE 30-A — Namespaced lookup

i18n.t('reminders:reminders.set.success', { relativeTime }, context.locale)

resolves to the reminders module's own en-US.json entry, with {relativeTime}
interpolated — collision-free against any other module's similarly-shaped key.
```

### 30.3 Right-to-Left Language Support

Locale files support right-to-left languages identically — plain text, with no directional
markup embedded by the framework. Discord's client renders RTL based on the string's Unicode
directionality; the framework's responsibility ends at supplying a correctly translated,
correctly encoded string.

### 30.4 Timezone & Formatting

The formatters module provides locale- and timezone-aware date, number, duration, and currency
formatting on the standard `Intl` API. A displayed date or time resolves against the guild's
configured timezone — never the server process's own timezone — falling back to UTC when
unset. Relative-time formatting produces locale-appropriate phrasing ("in 3 hours").

### 30.5 How To Verify This Section Against the Code

- The i18n manager and formatters: `apps/main/src/i18n/i18n-manager.ts`,
  `src/i18n/formatters.ts`.
- The mandatory base locale: `packages/modules/*/locales/en-US.json`.

Divergences are recorded in `status/code-reconciliation.json`.

## Contract
- `contracts/errors.json`

## Acceptance
```acceptance
- id: ACC-OPS-0030-1
  check: "Locale resolves guild -> user -> en-US; `en-US.json` is required and Stage 11 fails without it"
  test: tests/integration/locale-resolution.spec.ts
```

## Edges (-> blueprint)
- SPEC-06-OPERATIONS -> all departments (observability + errors are cross-cutting)
- SPEC-06-OPERATIONS#SECURITY -> SPEC/00-GOVERNANCE (secrets, ban registry enforcement)

## Named entities (from the original reference)

The original reference named these entities in "30. Localization & Internationalization". They are preserved here so no identifier is lost in the restructure.

**classes, interfaces & symbols:** `Arabic`, `English-only`, `Hebrew`, `formatRelative`, `guildConfigSchema.locale`
