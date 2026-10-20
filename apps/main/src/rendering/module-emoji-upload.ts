import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Client } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import {
  COMMAND_DECORATION_ICON_NAME,
  FALLBACK_MODULE_ICON_NAME,
  IDENTITY_ICON_NAME,
  INFO_ICON_NAME,
  PROFILE_ICON_NAME,
  registerModuleEmoji,
  unregisterModuleEmoji,
  STATUS_OFFLINE_ICON_NAME,
  STATUS_ONLINE_ICON_NAME,
  UNINSTALL_ICON_NAME,
  DEFAULT_EMOJI_SCOPE,
} from './module-icons.js';

/**
 * items 1/2/5 — the framework's bundled icon assets. Each is uploaded once as an application emoji
 * and registered under its name, so a page can reference it as `<:name:id>`:
 *
 *   - `dumby_module`  — the white-square DECORATION beside each command in a module's own command
 *                       list on the dashboard's module page (UR-20261011-009; not a logo).
 *   - `dumby_module_fallback` — the fallback LOGO for a module that declares no `ui.icon`.
 *   - `dumby_uninstall` — the module-detail card's uninstall / disable control icon.
 *   - `dumby_home`    — the Home control's bold white icon (item 2).
 *   - `dumby_discover`— the Discover control's bold white magnifier (item 2).
 *   - `dumby_refresh` — the health page's Refresh control's bold white circular arrow.
 *   - `dumby_<slug>`  — the framework CORE module logo icons (item 1), shown beside each core
 *                       command on the dashboard main page.
 */
const ICON_ASSETS: ReadonlyArray<readonly [string, string]> = [
  [COMMAND_DECORATION_ICON_NAME, '../../assets/default-module-icon.png'],
  [FALLBACK_MODULE_ICON_NAME, '../../assets/module-fallback-icon.png'],
  [UNINSTALL_ICON_NAME, '../../assets/uninstall-icon.png'],
  ['dumby_home', '../../assets/home-icon.png'],
  ['dumby_discover', '../../assets/discover-icon.png'],
  ['dumby_refresh', '../../assets/refresh-icon.png'],
  // UR-20261012-026 — the /persona page's indicator set.
  [STATUS_ONLINE_ICON_NAME, '../../assets/status-online-icon.png'],
  [STATUS_OFFLINE_ICON_NAME, '../../assets/status-offline-icon.png'],
  [INFO_ICON_NAME, '../../assets/info-icon.png'],
  [IDENTITY_ICON_NAME, '../../assets/identity-icon.png'],
  [PROFILE_ICON_NAME, '../../assets/profile-icon.png'],
];

/**
 * Uploads the framework icon set as application emojis (once) and registers each id, so a module
 * that declares no icon — and the Home control — can reference the framework's own assets.
 * Idempotent: an emoji of the same name is reused rather than duplicated. Any per-asset failure is
 * non-fatal — the caller logs it and the unicode fallback applies.
 */
/**
 * UR-20261012-066 — a module's OWN logo, as its manifest declares it.
 *
 * The module names the emoji (`ui.icon`) and points at the image (`ui.iconAsset`, relative to the
 * module's root). The core resolves and registers it; it does not carry a copy of either. That is
 * ADR-012's pattern — a declared UI field, with a framework default — applied to the logo, which is
 * what `assets/` in every module package is for.
 */
export interface ModuleIconAsset {
  /** The emoji name the module declares (`ui.icon`). */
  readonly name: string;
  /** The absolute path to the image, resolved against the module's root. */
  readonly path: string;
}

export async function ensureDefaultModuleEmoji(
  client: Client,
  logger: Logger,
  // UR-20261012-057 — WHOSE application to upload to. The main bot uses the default scope; a persona
  // uploads the same set to its OWN application, because an emoji belongs to one application and a
  // message may only reference an emoji its own application owns.
  applicationId: string = DEFAULT_EMOJI_SCOPE,
  /** UR-20261012-066 — the module logos, collected from the registry by the caller. */
  moduleIcons: readonly ModuleIconAsset[] = [],
): Promise<void> {
  // discord.js types `client.application` as `Application | null` until the client is ready;
  // a missing application is a skip, not a failure, and the unicode fallback applies.
  const application = client.application;
  if (application === null || application === undefined) {
    logger.warn('module-emoji-upload-failed', { reason: 'application-unavailable' });
    return;
  }

  const existing = await application.emojis.fetch();
  // The framework's own chrome, then every module's declared logo. One list, assembled from two
  // owners — and each owner states its own fact exactly once.
  const assets: ReadonlyArray<readonly [string, string]> = [
    ...ICON_ASSETS,
    ...moduleIcons.map((icon) => [icon.name, icon.path] as const),
  ];
  for (const [name, rel] of assets) {
    try {
      const found = existing.find((emoji) => emoji.name === name);
      if (found !== undefined) {
        registerModuleEmoji(name, found.id, applicationId);
        logger.info(
          `module-emoji-ready app=${applicationId || 'main'} name=${name} id=${found.id}`,
        );
        continue;
      }
      // A framework path is relative to this file; a module path is already absolute.
      const attachment = await readFile(rel.startsWith('/') ? rel : new URL(rel, import.meta.url));
      const created = await application.emojis.create({ attachment, name });
      registerModuleEmoji(name, created.id, applicationId);
      logger.info('module-emoji-created', { name, id: created.id });
    } catch (err) {
      logger.warn(
        `module-emoji-upload-failed app=${applicationId || 'main'} name=${name} reason=${String(err)}`,
      );
    }
  }
}

/** The image extensions a module's asset directory may hold for an emoji. */
const EMOJI_ASSET_EXT = /\.(png|webp|gif|jpe?g)$/i;

/**
 * item 5 — every emoji image in a module's OWN asset directory (`<moduleRoot>/assets/`), each mapped
 * to a stable application-emoji name `dumby_<slug>_<basename>`. This is the "render the emojis that
 * live in the module's root asset directory alongside its other branding" method: a module ships its
 * visual assets under `assets/`, and the core registers each as an application emoji it owns.
 *
 * A missing or unreadable directory yields an empty list (a module need not ship assets).
 */
export async function collectModuleEmojiAssets(
  moduleRoot: string,
  slug: string,
): Promise<readonly ModuleIconAsset[]> {
  const dir = join(moduleRoot, 'assets');
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const safeSlug = slug.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const out: ModuleIconAsset[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !EMOJI_ASSET_EXT.test(entry.name)) continue;
    const base = entry.name
      .replace(EMOJI_ASSET_EXT, '')
      .replace(/[^a-z0-9_]/gi, '_')
      .toLowerCase();
    out.push({ name: `dumby_${safeSlug}_${base}`, path: join(dir, entry.name) });
  }
  return out;
}

/**
 * item 5 — DELETE one application emoji by name, and drop its registration. Idempotent: a name that
 * is not present is a no-op (returns false) rather than an error, so a sync that runs twice is safe.
 */
export async function deleteModuleEmoji(
  client: Client,
  logger: Logger,
  name: string,
  applicationId: string = DEFAULT_EMOJI_SCOPE,
): Promise<boolean> {
  const application = client.application;
  if (application === null || application === undefined) {
    logger.warn('module-emoji-delete-failed', { reason: 'application-unavailable', name });
    return false;
  }
  try {
    const existing = await application.emojis.fetch();
    const found = existing.find((emoji) => emoji.name === name);
    unregisterModuleEmoji(name, applicationId);
    if (found === undefined) return false;
    await application.emojis.delete(found.id);
    logger.info(`module-emoji-deleted app=${applicationId || 'main'} name=${name} id=${found.id}`);
    return true;
  } catch (err) {
    logger.warn(
      `module-emoji-delete-failed app=${applicationId || 'main'} name=${name} reason=${String(err)}`,
    );
    return false;
  }
}

/**
 * item 5 — PRUNE application emojis the framework manages (`dumby_*`) that are no longer declared,
 * so a module's removed or renamed asset does not leave a dangling emoji behind. `keep` is the full
 * set of names still in use. Only names matching the managed prefix are considered — an emoji the
 * operator uploaded by hand is never touched.
 */
export async function pruneModuleEmojis(
  client: Client,
  logger: Logger,
  applicationId: string,
  keep: ReadonlySet<string>,
  prefix = 'dumby_',
): Promise<readonly string[]> {
  const application = client.application;
  if (application === null || application === undefined) return [];
  const deleted: string[] = [];
  try {
    const existing = await application.emojis.fetch();
    for (const emoji of existing.values()) {
      const name = emoji.name;
      if (name === null || !name.startsWith(prefix) || keep.has(name)) continue;
      await deleteModuleEmoji(client, logger, name, applicationId);
      deleted.push(name);
    }
  } catch (err) {
    logger.warn(`module-emoji-prune-failed app=${applicationId || 'main'} reason=${String(err)}`);
  }
  return deleted;
}

/**
 * item 5 — the full sync: register/load every declared emoji, then prune the managed emojis that are
 * no longer declared. One call gives a module's asset set and the framework chrome a stable, pruned
 * application-emoji population.
 */
export async function syncModuleEmojis(
  client: Client,
  logger: Logger,
  applicationId: string = DEFAULT_EMOJI_SCOPE,
  moduleIcons: readonly ModuleIconAsset[] = [],
  options: { prune?: boolean } = {},
): Promise<void> {
  await ensureDefaultModuleEmoji(client, logger, applicationId, moduleIcons);
  if (options.prune !== true) return;
  const keep = new Set<string>([
    ...ICON_ASSETS.map(([name]) => name),
    ...moduleIcons.map((icon) => icon.name),
  ]);
  await pruneModuleEmojis(client, logger, applicationId, keep);
}
