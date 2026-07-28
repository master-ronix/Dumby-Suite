# Dumby — End-User Interface Reference

**Dumby Project · Release 24 July 2026 · Document v1.0**

## Scope

This document is the complete end-user interface reference for Dumby — the Discord
Unified Modular Bot System — as released on **24 July 2026**. As of this date, Dumby's
entire user-facing surface is exactly two slash commands: no dashboard, no website, no
terminal interface, no additional command, and no configuration surface of any kind.
Every screen, message, and interaction a user can encounter with Dumby on this date is
described below in full; nothing has been omitted, and nothing beyond it exists to
document.

## At a Glance

| Command | Tier | Arguments | Reply Contains | Visibility |
|---|---|---|---|---|
| `/health` | Core | None | Ping (ms) + Latency (ms) | Public |
| `/hello` | Core | None | `Hello, World!` | Public |

---

## Interface Format: Discord Components V2

Both commands reply using Discord's **Components V2** message system rather than a
classic embed. This single format decision governs everything a user sees on screen
for either command:

- The reply is sent with the `IS_COMPONENTS_V2` message flag (`1 << 15`, decimal
  `32768`). Once a message carries this flag, its entire visible content must be built
  from components — a legacy `embeds` array or a plain `content` string cannot be
  mixed in alongside it.
- Each reply is exactly one **Container** component (type `17`): a rounded, bordered
  block with an optional accent color down its left edge, occupying the space an
  embed's card used to.
- Inside the Container sits exactly one **Text Display** component (type `10`),
  holding the reply's text as Markdown. Nothing else is nested alongside it — no
  Section, no Thumbnail, no Media Gallery, no Separator, no button, no select menu,
  and no Action Row.
- Neither reply is interactive. There is nothing to click, select, or page through —
  what appears the instant the command finishes running is the entire interface. It
  does not change, expand, or update afterward.
- Both replies sit trivially inside Components V2's size limits (a shared
  4,000-character ceiling across all Text Display content; 40 components maximum per
  message) — truncation or overflow is not possible for either command.

---

## Module 1 — Health (`/health`)

### Purpose

Lets any member confirm that Dumby is online and responsive, and see two
connection-health figures.

### Command

| Field | Value |
|---|---|
| Command | `/health` |
| Arguments | None |
| Subcommands | None |
| Configurable options | None |

### Availability

| Field | Value |
|---|---|
| Tier | Core — installed permanently in every server Dumby is in; cannot be disabled; never appears or disappears from a server's command list |
| Who can run it | Any server member — no special role or permission required |
| Where it works | Inside a server, in any channel Dumby can respond in; not usable in a direct message with Dumby |
| Reply visibility | Public — visible to everyone in the channel |
| Response time | Immediate — no "thinking" or loading state |

### What It Displays

The reply contains precisely two figures and nothing else — no bot name, tag, uptime,
server count, memory, CPU, or module count:

| Field | Meaning | Unit |
|---|---|---|
| **Ping** | The round-trip health of Dumby's persistent Discord gateway connection (its WebSocket heartbeat) | milliseconds |
| **Latency** | The round-trip time for this specific command, from invocation to reply | milliseconds |

Both values are measured live at the moment `/health` runs — never cached, never
pre-computed.

### Example Output

Rendered as a single Container holding one Text Display:

```
Ping: 42ms
Latency: 108ms
```

*Figures shown are illustrative — actual millisecond values differ on every
invocation and reflect real conditions at that moment.*

### Edge Case

For a few seconds immediately after Dumby restarts, before its first gateway
heartbeat completes, the Ping figure may briefly be unavailable or read as zero. This
resolves on its own within moments and requires no action from the user.

### Explicitly Excluded From This Command

By design, `/health` never surfaces hardware or host statistics, software or version
information, bandwidth or network throughput, third-party API status, a count of
installed modules, server-usage counts, or any overall "maximum health" rating.
Only Ping and Latency appear.

---

## Module 2 — Hello World (`/hello`)

### Purpose

A minimal, dependency-free command confirming Dumby can receive a slash command and
reply — independent of `/health`'s connection data.

### Command

| Field | Value |
|---|---|
| Command | `/hello` |
| Arguments | None |
| Subcommands | None |
| Configurable options | None |

> Discord command names cannot contain a space character, and this module carries no
> subcommands — so the command a user actually types is `/hello`. "Hello World"
> names what the command does, not literal text typed after the command.

### Availability

| Field | Value |
|---|---|
| Tier | Core — installed permanently, cannot be disabled, always present in every server's command list |
| Who can run it | Any server member — no special role or permission required |
| Where it works | Inside a server, in any channel Dumby can respond in; not usable in a direct message with Dumby |
| Reply visibility | Public — visible to everyone in the channel |
| Response time | Immediate — no "thinking" or loading state |

### What It Displays

Exactly one line of text, and nothing else:

```
Hello, World!
```

No name, no user mention, no timestamp, and no additional line is ever added.

### Example Output

Rendered as a single Container holding one Text Display:

```
Hello, World!
```

---

## Document Control

| Field | Value |
|---|---|
| Document version | 1.0 |
| Effective date | 24 July 2026 |
| Covers | `/health` and `/hello` — the entirety of Dumby's end-user interface at this date |
| Revision trigger | Any future change to either command, or the addition of a new end-user-facing command or interface |
