---
id: DOC-FEAT-RENDERER-PRESENTATION
title: Renderer & Presentation
kind: documentation
status: derived
version: 5.0.0
authority_scope: [features]
contracts: []
acceptance: []
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

# Renderer & Presentation

The Renderer is the single presentation authority for every Discord-facing surface. No
module, core subsystem, or helper library constructs message payloads directly: every page,
buffer, formal notice, and interactive component the user sees is issued by the Renderer
against one grammar. That single emission path is what makes the classic-embed ban and the
prefix-command ban terminal rather than aspirational — there is no route around them.

**One static grammar, four dynamic slots.** Every render is built from a Components v2 frame
(container, dividers, title/subtitle, footer), filled through dynamic slots: the accent, a
banner, the module identity, and the content. The accent is a single official value — blurple
`#5865F2` — everywhere, never per-command. Titles follow one grammar (the "A4" title and
attribution grammar), so a surface title carries the module identity and attribution lives in
the footer/subtitle slot.

**Three density modes.** Every page renders in one of three modes — D (detailed), M (medium),
or C (compact). The Renderer picks a default per surface and context (command invocations and
the dashboard home default to D; confirmations and transient results to C), and the invoker
can switch density through the footer control. The mode changes density, never content
semantics.

**The buffer-then-render lifecycle.** Every interaction receives an instant buffer embed at
acknowledgment time, before any business logic runs; when the command completes, that buffer
is edited into the final render. Autocomplete is the deliberate exception — it must answer
within the second, so it never receives a buffer. When a command cannot complete, the buffer
is edited into the **formal notice frame** instead: one merged presentation for failure,
maintenance, and unknown-command, carrying exactly two machine-correlatable fields — a reason
code (one of a normative set of ten) and the interaction's trace correlation id.

**Authors declare schemas; the Renderer derives presentation.** A module returns page data,
not a payload. The Renderer validates the data against the command's declared schema and
issues the render. A module author therefore never owns visual presentation and never builds
an embed.

See `contracts/ui-renderer.schema.json`; the full grammar is in `spec/request-layer/` §20.8–§20.9.
