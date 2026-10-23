/**
 * Project-wide module icons (UR-20261008-004; split for UR-20261011-009).
 *
 * A module's logo is a **custom Discord emoji**. The manifest's `ui.icon` names the emoji. A module
 * that names none — or whose declared emoji did not resolve — falls back to the framework's neutral
 * module marker: the wireframe cube `dumby_module` (`default-module-icon.png`).
 *
 * Three names sit close together and are easy to confuse, so each is stated once, here:
 *
 *   - `dumby_module`  — the module-logo **FALLBACK**. A cube. The framework's own asset, used when a
 *                       module declares no icon. It is NOT the marker beside a command.
 *   - `dumby_modules` — the **squared marker beside each command** in a module's command list. It is
 *                       the `modules` module's declared logo (a 2×2 grid of squares), never a logo
 *                       fallback.
 *   - `dumby_home`    — the Home control's house, AND the dashboard module's logo: the dashboard
 *                       module declares this same emoji rather than shipping a duplicate house.
 *
 * Two assets were duplicates and are RETIRED — `dumby_module_fallback` (a filled cube, duplicating
 * `dumby_module`) and `dumby_dashboard` (a house, duplicating `dumby_home`). Neither is uploaded any
 * more, and an already-registered one is DELETED from every application at boot — the main bot and
 * every persona alike. The retired names are listed as literals in `RETIRED_EMOJI_NAMES`
 * (`module-emoji-upload.ts`): a name that is no longer an icon has no business being a constant here.
 *
 * The unicode fallbacks differ by role on purpose: the logo path keeps the package glyph (a package
 * says more than a bare square), the command marker keeps the white square it depicts.
 *
 * An emoji id is only known at runtime, so the registry below is populated when the bot uploads the
 * emojis. Until then — or if the upload failed — a unicode fallback is used, so a page never renders
 * without an icon.
 */
/**
 * The framework's generic module icon — the wireframe cube `dumby_module`, from the framework's own
 * `default-module-icon.png`. It is what a module's logo FALLS BACK to when the module declares no
 * `ui.icon`, or its declared emoji did not resolve.
 *
 * Named to match every other icon in this file: `<THING>_ICON_NAME` is the emoji's name, and
 * `<THING>_FALLBACK` is the unicode glyph used when that emoji is unavailable. The emoji's own name
 * (`dumby_module`) sits one letter from the command marker's (`dumby_modules`), so each is stated once.
 */
export const MODULE_ICON_NAME = 'dumby_module';
/** Used only when the module-icon emoji is unavailable (before the upload, or if it failed). */
export const MODULE_FALLBACK = '\u{1F4E6}'; // package

/**
 * The STATUS marks — what a module's state looks like in a listing, as one glyph beside the text.
 *
 *   `dumby_occupied`        a padlock: the module is claimed by another profile in this guild.
 *   `dumby_tier_standard`   a diamond: standard tier.
 *   `dumby_tier_marketplace` a hexagon: marketplace tier.
 *
 * Shapes, not pictures, for the tiers: the first marketplace mark I drew was a bag, which had the same
 * silhouette as the padlock — a rounded rectangle with an arc on top — and the two would have been
 * indistinguishable at emoji size.
 */
export const OCCUPIED_ICON_NAME = 'dumby_occupied';
export const TIER_STANDARD_ICON_NAME = 'dumby_tier_standard';
export const TIER_MARKETPLACE_ICON_NAME = 'dumby_tier_marketplace';

/**
 * The page icon — a stack of pages, from the framework's own `page-icon.png`. It labels the /modules
 * dial, whose options are the LISTING PAGES rather than the modules: that surface pages the modules
 * themselves, so a page is what a member moves between, and one consistent icon says so.
 */
export const PAGE_ICON_NAME = 'dumby_page';

/**
 * The squared marker beside each command in a module's command list. It is the `modules` module's
 * declared logo — a 2x2 grid of squares. NOT the module-icon fallback above.
 */
export const COMMAND_MARKER_ICON_NAME = 'dumby_modules';
/** Used only when the marker emoji is unavailable (before the upload, or if it failed). */
export const COMMAND_MARKER_FALLBACK = '\u2b1c'; // white medium square

/** The uninstall / disable control's icon (the module-detail card's control). */
export const UNINSTALL_ICON_NAME = 'dumby_uninstall';

/**
 * UR-20261012-026 — the /persona page's indicator set. The page uses custom application emojis
 * rather than general unicode glyphs for its status, identity and info markers, so the board reads
 * as one designed surface. Each resolves through `customEmojiRef`; a unicode fallback applies until
 * the upload lands (or if it failed), so a page never renders without an indicator.
 */
/** The three states a subsystem can be in, as one glyph each. */
/**
 * The /health METRIC marks — one per column, so a health line is scannable rather than a wall of
 * `Label: value`. Same set, same line art, same 256px, same stroke.
 */
export const METRIC_PING_ICON_NAME = 'dumby_metric_ping';
export const METRIC_STATUS_ICON_NAME = 'dumby_metric_status';
export const METRIC_SHARD_ICON_NAME = 'dumby_metric_shard';
export const METRIC_UPTIME_ICON_NAME = 'dumby_metric_uptime';
export const METRIC_NODE_ICON_NAME = 'dumby_metric_node';
export const METRIC_MEMORY_ICON_NAME = 'dumby_metric_memory';
export const METRIC_HEAP_ICON_NAME = 'dumby_metric_heap';
export const METRIC_TOTAL_ICON_NAME = 'dumby_metric_total';
export const METRIC_PROFILE_ICON_NAME = 'dumby_metric_profile';
export const METRIC_LOADED_ICON_NAME = 'dumby_metric_loaded';
export const TIER_CORE_ICON_NAME = 'dumby_tier_core';
export const TIER_ADMIN_ICON_NAME = 'dumby_tier_admin';

export const STATUS_DEGRADED_ICON_NAME = 'dumby_status_degraded';
export const STATUS_ONLINE_ICON_NAME = 'dumby_status_online';
export const STATUS_OFFLINE_ICON_NAME = 'dumby_status_offline';
export const INFO_ICON_NAME = 'dumby_info';
export const IDENTITY_ICON_NAME = 'dumby_identity';
export const PROFILE_ICON_NAME = 'dumby_profile';

/** The unicode fallbacks for the indicator set, used only when the emoji is unavailable. */
export const STATUS_ONLINE_FALLBACK = '\u{1F7E2}'; // green circle
export const STATUS_OFFLINE_FALLBACK = '\u26AB'; // medium black circle
export const INFO_FALLBACK = '\u2139\uFE0F'; // information
export const IDENTITY_FALLBACK = '\u{1FAAA}'; // identification card
export const PROFILE_FALLBACK = '\u{1F464}'; // bust in silhouette

/**
 * UR-20261012-060 — EVERY reader takes the application id as a REQUIRED argument.
 *
 * With a default, a call site that forgot it silently borrowed the MAIN BOT's ids, and Discord renders
 * an id belonging to another application as the literal `:name:` — so the failure was invisible in code
 * review and visible only on a persona's page. Required arguments make the compiler enumerate every
 * site that has not decided which application it is rendering for.
 *
 * UR-20261012-057 — the emoji ids are kept PER APPLICATION, not in one process-wide map.
 *
 * An application emoji belongs to ONE Discord application, and a message may only reference an emoji
 * its own application owns: sending another application's id renders as the literal `:name:` instead of
 * the icon. Because the multi-persona runtime hosts personas in the SAME process as the main bot, a
 * single shared map meant a persona's page embedded the MAIN BOT's ids — and every icon came out as
 * `:dumby_browse:`, which is exactly what the operator saw.
 *
 * There is deliberately NO fallback from one application to another. An id from the wrong application
 * is worse than no id at all: the unicode fallback renders, the wrong id does not.
 */
const emojiIdsByApplication = new Map<string, Map<string, string>>();

/** The scope used by a render that does not name an application (the main bot's own). */
export const DEFAULT_EMOJI_SCOPE = '';

export function registerModuleEmoji(
  name: string,
  id: string,
  applicationId: string = DEFAULT_EMOJI_SCOPE,
): void {
  const scope = emojiIdsByApplication.get(applicationId) ?? new Map<string, string>();
  scope.set(name, id);
  emojiIdsByApplication.set(applicationId, scope);
}

export function resetModuleEmojis(): void {
  emojiIdsByApplication.clear();
}

/** Remove a single name→id registration (e.g. after the emoji is deleted from Discord). */
export function unregisterModuleEmoji(
  name: string,
  applicationId: string = DEFAULT_EMOJI_SCOPE,
): void {
  emojiIdsByApplication.get(applicationId)?.delete(name);
}

/** Every name→id this application has registered, so a caller can compute what to prune. */
export function registeredEmojiIds(
  applicationId: string = DEFAULT_EMOJI_SCOPE,
): ReadonlyMap<string, string> {
  return emojiIdsByApplication.get(applicationId) ?? new Map<string, string>();
}

/** This application's id for an emoji NAME, or undefined. Never borrowed from another application. */
function emojiIdFor(name: string, applicationId: string): string | undefined {
  return emojiIdsByApplication.get(applicationId)?.get(name);
}

/** The `<:name:id>` reference for an uploaded custom emoji, or undefined when it is not available. */
export function customEmojiRef(name: string, applicationId: string): string | undefined {
  const id = emojiIdFor(name, applicationId);
  return id === undefined ? undefined : `<:${name}:${id}>`;
}

/**
 * The `{ name, id }` parts for a registered custom emoji, or undefined when it is not available.
 * A Discord button carries an emoji as a structured `{ name, id }`, not as the `<:name:id>` string
 * a text line uses — so the Home control resolves its icon through this.
 */
export function customEmojiParts(
  name: string,
  applicationId: string,
): { name: string; id: string } | undefined {
  const id = emojiIdFor(name, applicationId);
  return id === undefined ? undefined : { name, id };
}

/**
 * A module's logo: the declared `ui.icon` — a custom-emoji name resolved to its `<:name:id>`
 * reference, or a unicode glyph used verbatim — else the framework **fallback logo**.
 */
export function moduleIcon(declared: string | undefined, applicationId: string): string {
  if (declared !== undefined && declared.length > 0) {
    const custom = customEmojiRef(declared, applicationId);
    if (custom !== undefined) return custom;
    // A unicode glyph is used verbatim; a bare custom-emoji NAME that did not resolve (the upload
    // failed, or the emoji is absent) falls back to the framework fallback logo rather than
    // printing the name as literal text beside the command.
    if (!/^[a-z0-9_]+$/i.test(declared)) return declared;
  }
  // The framework's module icon — the cube `dumby_module`. It is a FALLBACK, not the marker beside a
  // command: `dumby_module_fallback`, its old duplicate, is retired and deleted at boot.
  return customEmojiRef(MODULE_ICON_NAME, applicationId) ?? MODULE_FALLBACK;
}

/**
 * UR-20261011-009 — the squared MARKER beside each command in a module's own command list on the
 * dashboard's module page. It is `dumby_modules` (the modules module's grid), never the module-logo
 * fallback — the two names differ by one letter, which is exactly why this was once mis-named.
 */
export function commandMarkerIcon(applicationId: string): string {
  return customEmojiRef(COMMAND_MARKER_ICON_NAME, applicationId) ?? COMMAND_MARKER_FALLBACK;
}
