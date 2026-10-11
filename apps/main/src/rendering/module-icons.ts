/**
 * Project-wide module icons (UR-20261008-004; split for UR-20261011-009).
 *
 * A module's logo is a **custom Discord emoji**. The manifest's `ui.icon` names the emoji; a module
 * that names none falls back to the framework's **fallback logo** (`module-fallback-icon.png`),
 * uploaded once as an application emoji at bootstrap (see `module-emoji-upload.ts`).
 *
 * The framework also bundles a **white-square decoration** (`default-module-icon.png`) that is NOT a
 * module logo: it is the neutral marker beside each command in a module's own command list on the
 * dashboard's module page. The two are distinct assets — the decoration is never used as a logo
 * fallback, and the fallback is never used as a decoration.
 *
 * An emoji id is only known at runtime, so the registry below is populated when the bot uploads the
 * emojis. Until then — or if the upload failed — a unicode fallback is used, so a page never renders
 * without an icon.
 */
export const COMMAND_DECORATION_ICON_NAME = 'dumby_module';
/** Used only when the decoration emoji is unavailable (before the upload, or if it failed). */
export const COMMAND_DECORATION_FALLBACK = '\u2b1c'; // white medium square

export const FALLBACK_MODULE_ICON_NAME = 'dumby_module_fallback';
/** Used only when the fallback-logo emoji is unavailable (before the upload, or if it failed). */
export const FALLBACK_MODULE_ICON = '\ud83d\udce6'; // package

/** The uninstall / disable control's icon (the module-detail card's control). */
export const UNINSTALL_ICON_NAME = 'dumby_uninstall';

const emojiIds = new Map<string, string>();

export function registerModuleEmoji(name: string, id: string): void {
  emojiIds.set(name, id);
}

export function resetModuleEmojis(): void {
  emojiIds.clear();
}

/** The `<:name:id>` reference for an uploaded custom emoji, or undefined when it is not available. */
export function customEmojiRef(name: string): string | undefined {
  const id = emojiIds.get(name);
  return id === undefined ? undefined : `<:${name}:${id}>`;
}

/**
 * The `{ name, id }` parts for a registered custom emoji, or undefined when it is not available.
 * A Discord button carries an emoji as a structured `{ name, id }`, not as the `<:name:id>` string
 * a text line uses — so the Home control resolves its icon through this.
 */
export function customEmojiParts(name: string): { name: string; id: string } | undefined {
  const id = emojiIds.get(name);
  return id === undefined ? undefined : { name, id };
}

/**
 * A module's logo: the declared `ui.icon` — a custom-emoji name resolved to its `<:name:id>`
 * reference, or a unicode glyph used verbatim — else the framework **fallback logo**.
 */
export function moduleIcon(declared?: string): string {
  if (declared !== undefined && declared.length > 0) {
    const custom = customEmojiRef(declared);
    if (custom !== undefined) return custom;
    // A unicode glyph is used verbatim; a bare custom-emoji NAME that did not resolve (the upload
    // failed, or the emoji is absent) falls back to the framework fallback logo rather than
    // printing the name as literal text beside the command.
    if (!/^[a-z0-9_]+$/i.test(declared)) return declared;
  }
  return customEmojiRef(FALLBACK_MODULE_ICON_NAME) ?? FALLBACK_MODULE_ICON;
}

/**
 * UR-20261011-009 — the neutral white-square decoration beside each command in a module's own
 * command list on the dashboard's module page (never a logo fallback).
 */
export function commandDecorationIcon(): string {
  return customEmojiRef(COMMAND_DECORATION_ICON_NAME) ?? COMMAND_DECORATION_FALLBACK;
}
