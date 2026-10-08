import { readFile } from 'node:fs/promises';
import type { Client } from 'discord.js';
import type { Logger } from '../logging/logger.js';
import { DEFAULT_MODULE_ICON_NAME, registerModuleEmoji } from './module-icons.js';

/** The bundled default white icon, resolved the same way the banner assets are (server.ts). */
const DEFAULT_ICON_ASSET = new URL('../../assets/default-module-icon.png', import.meta.url);

/**
 * item 9 — uploads the framework's default white module icon as an application emoji (once) and
 * registers its id, so every module that declares no icon can reference it. Idempotent: an emoji
 * of the same name is reused rather than duplicated. Any failure is non-fatal — the caller logs it
 * and the unicode fallback applies.
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
  const found = existing.find((emoji) => emoji.name === DEFAULT_MODULE_ICON_NAME);
  if (found !== undefined) {
    registerModuleEmoji(DEFAULT_MODULE_ICON_NAME, found.id);
    logger.info('module-emoji-ready', { name: DEFAULT_MODULE_ICON_NAME, id: found.id });
    return;
  }

  const attachment = await readFile(DEFAULT_ICON_ASSET);
  const created = await application.emojis.create({ attachment, name: DEFAULT_MODULE_ICON_NAME });
  registerModuleEmoji(DEFAULT_MODULE_ICON_NAME, created.id);
  logger.info('module-emoji-created', { name: DEFAULT_MODULE_ICON_NAME, id: created.id });
}
