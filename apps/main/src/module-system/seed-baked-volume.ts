import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Logger } from '../logging/logger.js';
import { hashFile } from './build-signing.js';

/** On-volume record of the slugs the last seed baked, so a removed baked module can be cleaned up. */
const SEED_STATE_FILE = '.baked-seed.json';

export interface SeedBakedVolumeResult {
  readonly seeded: readonly string[];
  readonly skipped: readonly string[];
  readonly removed: readonly string[];
  readonly failed: readonly string[];
}

/**
 * UR-20261018-093 / UR-20261019-100 (Option B) — seed the module volume from the image's baked tree.
 *
 * Under Option B the module root is the Railway volume, whose mount SHADOWS the image's baked tree, so
 * a fresh volume is empty. This runs BEFORE the loader and reconciles the volume against the image:
 *   - the **image is authoritative for baked slugs** (those in the manifest): copy/refresh them;
 *   - the **volume is authoritative for promoted slugs** (never in the manifest): leave them alone;
 *   - a slug that was baked before but is gone from the new image is removed.
 * A failure is returned (not swallowed) so the caller can abort the boot rather than start half-seeded.
 */
export function seedBakedVolume(input: {
  readonly modulesDir: string;
  readonly manifestPath: string;
  readonly logger: Logger;
  readonly bakedRoot?: string;
}): SeedBakedVolumeResult {
  const { modulesDir, manifestPath, logger } = input;
  const bakedRoot = input.bakedRoot ?? dirname(manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, string>;

  // An EMPTY manifest is a misconfiguration, not "there are no baked modules". Treating it as the
  // latter would remove every slug listed in `.baked-seed.json` — data loss. Under Option B an empty
  // or unreadable manifest aborts the seeder (the caller fails the boot). A deliberately baked-less
  // deploy must be explicit (leave BAKED_MODULES_MANIFEST unset, so the seeder never runs).
  if (Object.keys(manifest).length === 0) {
    throw new Error(
      `baked manifest is empty (${manifestPath}) — refusing to seed; would remove every previously-seeded slug`,
    );
  }

  // Never seed the image onto itself. If the target IS the baked root (e.g. the pre-flip state, while
  // MODULES_DIR still points at the image), there is nothing to reconcile — do nothing.
  if (resolve(modulesDir) === resolve(bakedRoot)) {
    logger.info('baked-seed-skipped-target-is-image', { modulesDir, bakedRoot });
    return { seeded: [], skipped: Object.keys(manifest), removed: [], failed: [] };
  }

  const statePath = join(modulesDir, SEED_STATE_FILE);
  // A corrupt or hand-edited record must not crash the boot: fall back to "nothing was seeded before".
  let previous: Record<string, string> = {};
  if (existsSync(statePath)) {
    try {
      previous = JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, string>;
    } catch (err) {
      logger.warn('baked-seed-state-unreadable', { statePath, error: String(err) });
      previous = {};
    }
  }

  const seeded: string[] = [];
  const skipped: string[] = [];
  const removed: string[] = [];
  const failed: string[] = [];

  for (const [key, expected] of Object.entries(manifest)) {
    const dest = join(modulesDir, key);
    const destIndex = join(dest, 'index.js');
    try {
      if (existsSync(destIndex) && hashFile(destIndex) === expected) {
        skipped.push(key);
        continue;
      }
      const src = join(bakedRoot, key);
      if (!existsSync(join(src, 'index.js'))) {
        failed.push(key);
        logger.error('baked-seed-source-missing', { key, src });
        continue;
      }
      // Copy into a temp dir, verify the hash, then atomically rename into place.
      const tmp = `${dest}.__seeding`;
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      cpSync(src, tmp, { recursive: true });
      if (hashFile(join(tmp, 'index.js')) !== expected) {
        rmSync(tmp, { recursive: true, force: true });
        failed.push(key);
        logger.error('baked-seed-hash-mismatch', { key, expected });
        continue;
      }
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dirname(dest), { recursive: true });
      renameSync(tmp, dest);
      seeded.push(key);
    } catch (err) {
      failed.push(key);
      logger.error('baked-seed-failed', { key, error: String(err) });
    }
  }

  // A slug baked by the PREVIOUS image but absent from the new manifest is a removed baked module.
  for (const key of Object.keys(previous)) {
    if (key in manifest) continue;
    try {
      rmSync(join(modulesDir, key), { recursive: true, force: true });
      removed.push(key);
    } catch (err) {
      logger.warn('baked-seed-remove-failed', { key, error: String(err) });
    }
  }

  try {
    writeFileSync(statePath, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    logger.warn('baked-seed-state-write-failed', { error: String(err) });
  }
  logger.info('baked-seed-complete', {
    seeded: seeded.length,
    skipped: skipped.length,
    removed: removed.length,
    failed: failed.length,
  });
  return { seeded, skipped, removed, failed };
}
