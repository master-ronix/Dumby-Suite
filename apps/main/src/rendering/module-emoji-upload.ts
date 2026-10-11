import { readFile } from 'node:fs/promises';
import type { Client } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import { DEFAULT_MODULE_ICON_NAME, registerModuleEmoji } from './module-icons.js';

/**
 * items 1/2/5 — the framework's bundled icon assets. Each is uploaded once as an application emoji
 * and registered under its name, so a page can reference it as `<:name:id>`:
 *
 *   - `dumby_module`  — the default white module icon; the fallback for any module that declares none
 *                       (item 5), and the icon shown on a MODULE page's command list.
 *   - `dumby_home`    — the Home control's bold white icon (item 2).
 *   - `dumby_<slug>`  — the first-party CORE module logo icons (item 1), shown beside each core
 *                       command on the dashboard main page.
 */
const ICON_ASSETS: ReadonlyArray<readonly [string, string]> = [
  [DEFAULT_MODULE_ICON_NAME, '../../assets/default-module-icon.png'],
  ['dumby_home', '../../assets/home-icon.png'],
  ['dumby_discover', '../../assets/discover-icon.png'],
  ['dumby_dashboard', '../../assets/module-icons/dashboard.png'],
  ['dumby_health', '../../assets/module-icons/health.png'],
  ['dumby_browse', '../../assets/module-icons/browse.png'],
  ['dumby_queue', '../../assets/module-icons/queue.png'],
  ['dumby_persona', '../../assets/module-icons/persona.png'],
  ['dumby_permit', '../../assets/module-icons/permit.png'],
  ['dumby_modules', '../../assets/module-icons/modules.png'],
];

/**
 * Uploads the framework icon set as application emojis (once) and registers each id, so a module
 * that declares no icon — and the Home control — can reference the framework's own assets.
 * Idempotent: an emoji of the same name is reused rather than duplicated. Any per-asset failure is
 * non-fatal — the caller logs it and the unicode fallback applies.
 */
export async function ensureDefaultModuleEmoji(client: Client, logger: Logger): Promise<void> {
  // discord.js types `client.application` as `Application | null` until the client is ready;
  // a missing application is a skip, not a failure, and the unicode fallback applies.
  const application = client.application;
  if (application === null || application === undefined) {
    logger.warn('module-emoji-upload-failed', { reason: 'application-unavailable' });
    return;
  }

  const existing = await application.emojis.fetch();
  for (const [name, rel] of ICON_ASSETS) {
    try {
      const found = existing.find((emoji) => emoji.name === name);
      if (found !== undefined) {
        registerModuleEmoji(name, found.id);
        logger.info('module-emoji-ready', { name, id: found.id });
        continue;
      }
      const attachment = await readFile(new URL(rel, import.meta.url));
      const created = await application.emojis.create({ attachment, name });
      registerModuleEmoji(name, created.id);
      logger.info('module-emoji-created', { name, id: created.id });
    } catch (err) {
      logger.warn('module-emoji-upload-failed', { name, reason: String(err) });
    }
  }
}
