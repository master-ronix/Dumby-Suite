/**
 * Project-wide module icons (UR-20261008-004, revised for item 9).
 *
 * A module's icon is a **custom Discord emoji**. The manifest's `ui.icon` names the emoji; a module
 * that names none falls back to the framework's default white icon, bundled at
 * `apps/main/assets/default-module-icon.png` and uploaded once as an application emoji at bootstrap
 * (see `module-emoji-upload.ts`).
 *
 * An emoji id is only known at runtime, so the registry below is populated when the bot uploads the
 * emojis. Until then — or if the upload failed — the unicode fallback is used, so a page never
 * renders without an icon.
 */
export const DEFAULT_MODULE_ICON_NAME = 'dumby_module';

/** Used only when no custom emoji is available (before the upload, or if it failed). */
export const FALLBACK_MODULE_ICON = '\u2b1c'; // white medium square

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
 * A module's icon for its command list: the declared `ui.icon` — a custom-emoji name resolved to
 * its `<:name:id>` reference, or a unicode glyph used verbatim — else the framework default.
 */
export function moduleIcon(declared?: string): string {
  if (declared !== undefined && declared.length > 0) {
    const custom = customEmojiRef(declared);
    if (custom !== undefined) return custom;
    // A unicode glyph is used verbatim; a bare custom-emoji NAME that did not resolve (the upload
    // failed, or the emoji is absent) falls back to the framework default rather than printing the
    // name as literal text beside the command.
    if (!/^[a-z0-9_]+$/i.test(declared)) return declared;
  }
  return customEmojiRef(DEFAULT_MODULE_ICON_NAME) ?? FALLBACK_MODULE_ICON;
}
