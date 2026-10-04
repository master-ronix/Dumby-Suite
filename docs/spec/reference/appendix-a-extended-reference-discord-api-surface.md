---
id: SPEC-08-REFERENCE-0006
title: Appendix A — Extended Reference: Discord API Surface
kind: spec
status: normative
version: 5.0.0
authority_scope: [08-reference]
anchors: [APPENDIX_A_EXTENDED_REFERENCE, A_1_GATEWAY_PROTOCOL, A_2_GATEWAY_CLOSE, A_3_COMPLETE_GATEWAY, A_4_INTENT_LANDSCAPE, A_5_INTERACTION_TYPES, A_6_APPLICATION_COMMAND, A_7_INSTALLATION_CONTEXTS, A_8_OAUTH2_SCOPES, A_9_AUTOMOD_LANDSCAPE, A_10_AUDIT_LOG, A_11_VOICE_CONNECTION]
contracts: []
acceptance: [ACC-REF-0006-1]
owners: [framework-maintainers]
last_verified_commit: null
review_state: pending-evidence
---

## Appendix A — Extended Reference: Discord API Surface

This section provides the exhaustive technical reference for the Discord API surface that Dumby integrates with. It is reference material for engineers implementing or extending Dumby's gateway, REST, and interaction subsystems. Every number, limit, and behavior described here is current as of Discord API version 10 and is verified against Discord's official documentation.

### A.1 Gateway Protocol

The Discord Gateway is a WebSocket connection that delivers real-time events to the bot. Dumby connects to the gateway using the wss://gateway.discord.gg URL with the query parameters ?v=10&encoding=json&compress=zlib-stream. The API version is pinned to 10. The encoding defaults to JSON, with ETF (binary encoding) available as an option requiring the etf-parser native addon. Compression uses zlib-stream (stream-based, persistent decompression context) as the default, with zlib-payload (per-payload decompression) as an alternative. The capabilities bitfield is sent during identification and includes bits for compressed payloads (bit 15), heartbeat acknowledgment (bit 19), and other protocol features.

The heartbeat interval is specified by the server in the HELLO event (typically 41,250 milliseconds). Dumby sends a heartbeat (opcode 1) at this interval and expects a heartbeat acknowledgment (opcode 11). If no acknowledgment is received within the interval, the connection is considered dead and a reconnection is attempted. The identify rate limit is 1 identify per 5 seconds per token — enforced by Discord and cannot be bypassed by any tier. The session start limit is 1,000 sessions per 24 hours for standard bots and 14,000 for large bots, replenished at approximately 1 session per 5 seconds (standard) or 1 per 0.25 seconds (large bot).

### A.2 Gateway Close Codes

Gateway close codes indicate why the WebSocket connection was closed and determine the reconnection strategy. Dumby categorizes these into recoverable and fatal codes.

Recoverable close codes trigger automatic reconnection with exponential backoff and jitter: 4000 (Unknown Error — Discord server error, reconnect with backoff), 4001 (Unknown Opcode — sent an invalid opcode, reconnect after fixing), 4002 (Decode Error — sent an invalid payload, reconnect after fixing), 4003 (Not Authenticated — sent a payload before identifying, reconnect and identify), 4007 (Invalid Seq — sent an invalid sequence number, reconnect and resume), 4008 (Rate Limited — sent too many payloads, backoff and reconnect), and 4009 (Session Timed Out — the session expired, reconnect and identify with a new session).

Fatal close codes cause the bot to halt and alert the bot owner: 4004 (Authentication Failed — the token is invalid, do not reconnect to avoid token ban), 4010 (Invalid Shard — the shard configuration is invalid), 4011 (Sharding Required — the guild count exceeds what one shard can handle, sharding must be enabled), 4013 (Invalid Intent — an invalid intent bit was requested), and 4014 (Disallowed Intent — a privileged intent was requested but not enabled in the Developer Portal). Fatal close codes trigger a P0 alert and the bot does not reconnect until the configuration is fixed.

### A.3 Complete Gateway Event Reference

The Discord Gateway dispatches over 60 named events. Each event requires a specific intent and is routed to specific tiers within Dumby. The following is a comprehensive listing.

READY and RESUMED require no intent and are handled by Core tier for session management. APPLICATION_COMMAND_PERMISSIONS_UPDATE requires the APPLICATION_COMMANDS intent and is handled by Core for permission synchronization. AUTO_MODERATION_RULE_CREATE, UPDATE, and DELETE require the AUTO_MODERATION_CONFIGURATION intent. AUTO_MODERATION_ACTION_EXECUTION requires the AUTO_MODERATION_EXECUTION intent and is handled by Core for event routing. CHANNEL_CREATE, UPDATE, DELETE, and PINS_UPDATE require the GUILDS intent. THREAD_CREATE, UPDATE, DELETE, LIST_SYNC, MEMBER_UPDATE, and MEMBERS_UPDATE require the GUILDS intent (THREAD_MEMBERS_UPDATE also accepts GUILD_MEMBERS). ENTITLEMENT_CREATE, UPDATE, and DELETE require the MONETIZATION intent. GUILD_CREATE, UPDATE, and DELETE require the GUILDS intent and are handled by Core for guild lifecycle management. GUILD_BAN_ADD and REMOVE require the GUILD_MODERATION intent. GUILD_EMOJIS_UPDATE, STICKERS_UPDATE, INTEGRATIONS_UPDATE, ROLE_CREATE, UPDATE, and DELETE require the GUILDS intent. GUILD_MEMBER_ADD, UPDATE, and REMOVE require the GUILD_MEMBERS privileged intent. GUILD_MEMBERS_CHUNK requires GUILD_MEMBERS. GUILD_SCHEDULED_EVENT_CREATE, UPDATE, DELETE, USER_ADD, and USER_REMOVE require the GUILD_SCHEDULED_EVENTS intent. INTEGRATION_CREATE, UPDATE, and DELETE require the GUILD_INTEGRATIONS intent. INTERACTION_CREATE requires no intent and is handled by Core for interaction routing. INVITE_CREATE and DELETE require the GUILD_INVITES intent. MESSAGE_CREATE and UPDATE require GUILD_MESSAGES (or MESSAGE_CONTENT for content). MESSAGE_DELETE and DELETE_BULK require GUILD_MESSAGES. MESSAGE_POLL_VOTE_ADD and REMOVE require GUILD_MESSAGE_POLLS or DIRECT_MESSAGE_POLLS. MESSAGE_REACTION_ADD, REMOVE, REMOVE_ALL, and REMOVE_EMOJI require GUILD_MESSAGE_REACTIONS or DIRECT_MESSAGE_REACTIONS. PRESENCE_UPDATE requires the GUILD_PRESENCES privileged intent. STAGE_INSTANCE_CREATE, UPDATE, and DELETE require the GUILDS intent. SUBSCRIPTION_CREATE, UPDATE, and DELETE require the MONETIZATION intent. TYPING_START requires GUILD_MESSAGE_TYPING or DIRECT_MESSAGE_TYPING. USER_UPDATE requires no intent. VOICE_CHANNEL_EFFECT_SEND and VOICE_STATE_UPDATE require GUILD_VOICE_STATES. VOICE_SERVER_UPDATE requires no intent. WEBHOOKS_UPDATE requires the GUILD_WEBHOOKS intent.

### A.4 Intent Landscape

Dumby declares non-privileged intents by default: GUILDS (bit 0), GUILD_MODERATION (bit 2), GUILD_MESSAGES (bit 9), GUILD_VOICE_STATES (bit 7), AUTO_MODERATION_EXECUTION (bit 21), and APPLICATION_COMMANDS (bit 24). These six intents are always requested and do not require special approval in the Developer Portal.

Privileged intents are optional and declared per-module: GUILD_MEMBERS (bit 1) is required by modules that need to track member joins, leaves, and updates. GUILD_PRESENCES (bit 8) is required by modules that need to track user online/offline status. MESSAGE_CONTENT (bit 15) is required by modules that need to read the content of messages (as opposed to just metadata like author, channel, and timestamp). When a module requires a privileged intent, the Interface Hub warns the guild owner during enablement or installation, explaining that the intent must be enabled in the Discord Developer Portal. If the intent is not enabled, the module's events will not fire and the module will not function correctly.

Additional non-privileged intents available but not always declared: GUILD_EMOJIS_AND_STICKERS (bit 3), GUILD_INTEGRATIONS (bit 4), GUILD_WEBHOOKS (bit 5), GUILD_INVITES (bit 6), GUILD_MESSAGE_REACTIONS (bit 10), GUILD_MESSAGE_TYPING (bit 11), DIRECT_MESSAGES (bit 12), DIRECT_MESSAGE_REACTIONS (bit 13), DIRECT_MESSAGE_TYPING (bit 14), GUILD_SCHEDULED_EVENTS (bit 16), AUTO_MODERATION_CONFIGURATION (bit 20), GUILD_MESSAGE_POLLS (bit 22), DIRECT_MESSAGE_POLLS (bit 23), and MONETIZATION (bit 29).

### A.5 Interaction Types and Response Deadlines

Discord sends five types of interactions, each with specific response deadlines. PING interactions (type 1) are health checks from Discord's webhook system and must be responded to within 1 second. The framework handles these automatically — no module is involved. APPLICATION_COMMAND interactions (type 2) are slash command and context menu invocations. The initial response deadline is 3 seconds, with a 15-minute follow-up window. MESSAGE_COMPONENT interactions (type 3) are button clicks and select menu selections, with the same 3-second/15-minute deadlines. APPLICATION_COMMAND_AUTOCOMPLETE interactions (type 4) are autocomplete requests triggered when a user types in an autocomplete-enabled option. The response deadline is 1 second. MODAL_SUBMIT interactions (type 5) are modal form submissions, with the same 3-second/15-minute deadlines as application commands.

Dumby auto-defers interactions at 2.5 seconds (providing a 500ms buffer before the 3-second deadline) if the module handler has not yet responded. After deferral, the module has up to 15 minutes to send a follow-up response. These deadlines apply to all tiers — even commands that bypass application-level rate limits must respond within Discord's deadlines. The 15-minute follow-up window is a hard limit imposed by Discord — after it expires, the interaction token is invalidated and no further responses can be sent.

### A.6 Application Command Types

Discord supports four application command types. CHAT_INPUT (type 1) is the standard slash command, invoked from the text input command picker. It is the primary command type for all modules and supports options (string, integer, number, boolean, user, channel, role, mentionable, attachment), subcommands, and subcommand groups. USER (type 2) is a user context menu command, invoked by right-clicking a user and selecting the command from the context menu. It is used for per-user actions like moderation. MESSAGE (type 3) is a message context menu command, invoked by right-clicking a message. It is used for per-message actions like flagging or starring. PRIMARY_ENTRY_POINT (type 4) is an entry point command for embedded UI experiences, used only by Core for framework entry points.

### A.7 Installation Contexts and Interaction Contexts

Discord supports two installation contexts. GUILD_INSTALL (type 0) means the application is installed to a guild and its commands are available in that guild. USER_INSTALL (type 1) means the application is installed to a user and its commands are available everywhere the user is, even in guilds where the bot is not a member. Dumby defaults to GUILD_INSTALL for all modules. USER_INSTALL is supported for Core modules only — user-installed commands work across all guilds the user is in, even guilds where the bot is not a member.

Discord supports three interaction contexts. GUILD (type 0) means the command can be used in a guild. BOT_DM (type 1) means the command can be used in a direct message with the bot. PRIVATE_CHANNEL (type 2) means the command can be used in a private channel between users. All modules support GUILD context by default. Core modules and modules that deliver to DMs (like reminders) support BOT_DM. Admin-tier commands are restricted to GUILD context in the dev server only — they are never available in DM or private channel contexts.

### A.8 OAuth2 Scopes

Dumby uses the following OAuth2 scopes for different purposes. The bot scope is used when adding the bot to a guild (Admin tier — bot installation). The applications.commands scope is used to install slash commands to a guild (Core — command installation). The applications.commands.permissions.update scope is used to update per-guild command permissions (Core — permission synchronization). The applications.commands.update scope is used to update commands for USER_INSTALL applications (Core — user-installable command updates). The identify scope is used to get the user's ID, username, and avatar (Core — Interface Hub authentication). The guilds scope is used to list the user's guilds (Core — Interface Hub guild list). The guilds.members.read scope is used to read guild members (Core — Interface Hub member list). The webhook.incoming scope is used to create webhooks (Standard — Custom Webhook Outbound feature).

The Interface Hub uses the Authorization Code Grant with PKCE flow. The user is redirected to Discord's OAuth2 authorization URL with the identify and guilds scopes. After the user authorizes, Discord redirects back to the Interface Hub's callback URL with an authorization code. The Interface Hub exchanges the code for an access token and a refresh token. The access token is used to fetch the user's identity and guild list. A session bearer token is issued for subsequent API calls. Admin endpoints require additional owner verification — the session identity must resolve to a configured bot owner (BOT_OWNER_IDS, §13.6).

### A.9 AutoMod Landscape

Discord's AutoMod system provides server-side content moderation with five trigger types. KEYWORD (type 1) matches keywords or regular expressions in message content. HARMFUL_LINK (type 2) detects and blocks malicious URLs. SPAM (type 3) detects spam patterns in message content. KEYWORD_PRESET (type 4) uses Discord-maintained keyword lists including profanity, sexual content, and slurs. MENTION_SPAM (type 5) detects excessive mentions in a single message.

Action types include BLOCK_MESSAGE (type 1, blocks the message and alerts the member), SEND_ALERT_MESSAGE (type 2, sends an alert to a designated channel), TIMEOUT_USER (type 3, applies a timeout to the user), QUARANTINE_USER (type 4, quarantines the user by applying a designated role), and BLOCK_MESSAGE_INTERACTION (type 6, blocks the message and prevents interaction-based actions).

The AUTO_MODERATION_ACTION_EXECUTION event (intent: AUTO_MODERATION_EXECUTION) is dispatched when an AutoMod rule triggers. In Dumby, this event is received by the Core tier event handler, which routes it to the internal event bus. This ensures that AutoMod events are always available for logging and analytics, even if the enhanced AutoMod management module is not installed.

### A.10 Audit Log Action Categories

Discord audit logs categorize actions into groups. Guild Update actions (GUILD_UPDATE) record changes to guild settings. Channel actions (CHANNEL_CREATE, UPDATE, DELETE, OVERWRITE_CREATE, OVERWRITE_UPDATE, OVERWRITE_DELETE) record channel and permission changes. Member actions (MEMBER_KICK, MEMBER_PRUNE, MEMBER_BAN_ADD, MEMBER_BAN_REMOVE, MEMBER_UPDATE, MEMBER_ROLE_UPDATE, MEMBER_MOVE, MEMBER_DISCONNECT) record member management actions. Role actions (ROLE_CREATE, UPDATE, DELETE) record role changes. Invite actions (INVITE_CREATE, UPDATE, DELETE) record invite changes. Webhook actions (WEBHOOK_CREATE, UPDATE, DELETE) record webhook changes. Emoji actions (EMOJI_CREATE, UPDATE, DELETE) record emoji changes. Message actions (MESSAGE_DELETE, MESSAGE_BULK_DELETE, MESSAGE_PIN, MESSAGE_UNPIN) record message management actions. Application Command Permission updates (APPLICATION_COMMAND_PERMISSION_UPDATE) record command permission changes. AutoMod actions (AUTO_MODERATION_RULE_CREATE, UPDATE, DELETE, BLOCK_MESSAGE) record AutoMod rule changes. Bot Add/Remove (BOT_ADD, BOT_REMOVE) records when bots are added to or removed from the guild.

The Audit Reader (Core infrastructure) reads audit logs via the REST API endpoint GET /guilds/{guild_id}/audit-logs. The rate limit is 1 audit log request per 10 seconds per guild — this is a Discord-imposed limit that no tier can bypass. The Audit Reader caches the most recent audit log entries in Redis (TTL 10 minutes) to reduce API calls. When a gateway event indicates an action was performed (e.g., GUILD_BAN_ADD), the Audit Reader queries the audit log to determine the actor (the user who performed the action), as this information is not included in the gateway event itself.

### A.11 Voice Connection Lifecycle

The Discord voice connection lifecycle consists of several stages. First, the bot sends a VOICE_STATE_UPDATE gateway payload with the target channel ID to join a voice channel. Discord responds with a VOICE_SERVER_UPDATE event containing the voice server endpoint and a token. The bot then connects to the voice server via WebSocket (wss://[endpoint]). After connection, the bot sends a Voice Identify (opcode 0) with the server_id, user_id, session_id, and token. The voice server responds with a Ready event (opcode 4) containing the SSRC (synchronization source) and port for UDP audio transport. The bot sends a Select Protocol (opcode 2) message choosing the encryption mode. The bot then sends heartbeats (opcode 3) every 5 seconds and Speaking (opcode 5) indicators when audio is being transmitted.

Audio is transported via UDP using Opus-encoded frames in 20-millisecond intervals. Each frame is encrypted with the selected encryption mode before being sent with RTP headers. The available encryption modes are xsalsa20_poly1305_lite (lightweight, recommended default), xsalsa20_poly1305_suffix (suffix-based nonce), xsalsa20_poly1305 (original mode, deprecated), aead_aes256_gcm_rtpsize (modern AEAD cipher, recommended for new implementations), and aead_xchacha20_poly1305_rtpsize (modern AEAD cipher).

The audio pipeline in Dumby's Music module (when installed) decodes the source via FFmpeg to raw PCM (48kHz, 16-bit, stereo), optionally applies audio filters (bassboost, nightcore, vaporwave, 8D, tremolo, vibrato) via FFmpeg's audio filter chain, encodes to Opus format (128kbps default, configurable), encrypts with the selected mode, and sends via UDP with RTP headers in 20-millisecond frames.

### A.12 Sharding Parameters

Sharding parameters govern how Dumby distributes gateway connections across multiple WebSocket connections. The recommended maximum is 2,500 guilds per shard — beyond this, event delivery latency degrades. The large bot sharding threshold is 150,000 guilds — bots exceeding this must use large bot sharding, which multiplies the shard count by 16. The maximum concurrency is 1 for standard bots (1 simultaneous IDENTIFY request) and 16 for large bots (16 simultaneous IDENTIFY requests). The session start limit is 1,000 per 24 hours for standard bots and 14,000 for large bots, replenished at approximately 1 per 5 seconds (standard) or 1 per 0.25 seconds (large bot). The heartbeat interval is server-specified, typically approximately 41,250 milliseconds.

Worker thread sharding distributes shards across Node.js worker threads. Each worker manages a configurable number of shards (default 2). Worker thread crashes do not affect other workers' shards. The main process coordinates worker lifecycle — spawn, respawn, and redistribute. When a worker crashes, the ShardManager detects the crash (via missed heartbeats) and respawns the worker's shards on another worker.

### A.13 Native Addons

Several optional native addons improve performance for specific subsystems. zlib-sync provides faster zlib decompression for gateway payloads — the fallback is the built-in zlib module, which is approximately 3 times slower in CPU usage. bufferutil provides faster WebSocket buffer operations — the fallback is built-in buffer handling, which is slower. sodium-native provides faster voice encryption (xsalsa20) — the fallback is tweetnacl, a pure JavaScript implementation that is approximately 5 times slower. better-sqlite3 provides fast local SQLite for testing — only used in the test environment. FFmpeg is required for audio transcoding in the Music module — without it, audio features are unavailable. @discordjs/voice is required for voice connection management. libsodium-wrappers is used as a voice encryption fallback when sodium-native is not installed. opusscript is used for Opus encoding when sodium-native is not installed.

The framework probes for each addon at boot. If an optional addon is missing, the framework logs a warning and uses the fallback. If a required addon is missing, the framework logs an error and disables the dependent feature. The Admin tier can force-enable features without addons for debugging purposes, but this is not recommended for production use.

### A.14 Discord Entity Cache Strategy

Dumby maintains an in-memory cache of Discord entities for fast access. The caching strategy varies by entity type. Guilds are always cached with no size limit and no TTL — they are invalidated by GUILD_UPDATE and GUILD_DELETE events. Channels are always cached for the current guild with no size limit — invalidated by CHANNEL_UPDATE and CHANNEL_DELETE. Roles are always cached for the current guild — invalidated by GUILD_ROLE_UPDATE and GUILD_ROLE_DELETE. Members use an LRU cache with a maximum of 10,000 per guild and a 30-minute TTL — invalidated by GUILD_MEMBER_UPDATE and GUILD_MEMBER_REMOVE. Users use an LRU cache with a maximum of 50,000 entries and a 60-minute TTL — invalidated by USER_UPDATE. Messages use an LRU cache with a maximum of 1,000 per channel and a 5-minute TTL — invalidated by MESSAGE_UPDATE and MESSAGE_DELETE. Presences use an LRU cache with a maximum of 10,000 entries and a 5-minute TTL — invalidated by PRESENCE_UPDATE. Emojis are always cached for the current guild — invalidated by GUILD_EMOJIS_UPDATE. Voice states are always cached for the current guild — invalidated by VOICE_STATE_UPDATE.

Cache warming at boot populates guild, channel, and role caches during the READY event. Member caches are warmed lazily on first access per guild. The Interface API warms user caches on authentication. Module caches are warmed per-guild on module installation.

### A.15 Resource Sizing Reference

Dumby is designed to scale from a single guild to hundreds of thousands of guilds. The following resource sizing table guides deployment configuration across six scale tiers.

At the Small scale (1 to 100 guilds), the deployment uses 1 shard, 1 pod, 0.5 vCPU per pod, 512MB RAM per pod, a db.t3.micro database, and a cache.t3.micro Redis instance. This is a single container with all tiers running in one process.

At the Medium scale (100 to 1,000 guilds), the deployment uses 1 shard, 2 pods, 1 vCPU per pod, 1GB RAM per pod, a db.t3.small database, and a cache.t3.small Redis. This provides high availability with 2 pods sharing a database.

At the Large scale (1,000 to 5,000 guilds), the deployment uses 2 shards, 3 pods, 2 vCPU per pod, 2GB RAM per pod, a db.t3.medium database, and a cache.t3.medium Redis. This adds sharding and a read replica.

At the Very Large scale (5,000 to 25,000 guilds), the deployment uses 4 to 10 shards, 5 pods, 4 vCPU per pod, 4GB RAM per pod, a db.r6g.large database, and a cache.r6g.large Redis. This adds multi-shard support, read replicas, and dedicated worker pods.

At the Enterprise scale (25,000 to 100,000 guilds), the deployment uses 10 to 40 shards, 10 pods, 4 vCPU per pod, 8GB RAM per pod, a db.r6g.xlarge database with 2 read replicas, and a cache.r6g.xlarge Redis cluster. This adds multi-region deployment, horizontal pod autoscaling, and spot instances for non-critical workloads.

At the Massive scale (100,000+ guilds), the deployment uses 40 or more shards (with large bot sharding at 16x multiplier), 20 or more pods, 8 vCPU per pod, 16GB RAM per pod, a db.r6g.2xlarge database with 5 global read replicas, and a cache.r6g.2xlarge Redis multi-region cluster. This tier requires large bot sharding, global replicas, and tier-dedicated worker pods.

## Contract
None (conceptual).

## Acceptance
```acceptance
- id: ACC-REF-0006-1
  check: "The Discord API surface appendix matches the discord.js v14 types in use"
  test: tests/docs/discord-api-surface.spec.ts
```

## Edges (-> blueprint)
- SPEC-08-REFERENCE -> status/compliance.json (generated from contracts + capabilities)
