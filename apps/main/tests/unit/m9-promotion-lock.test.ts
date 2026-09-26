import { test, expect, describe } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  readlinkSync,
  existsSync,
  lstatSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  promoteAtomically,
  promoteUnderLock,
  PromotionLockedError,
  PROMOTION_LOCK_KEY_PREFIX,
  rollbackPromotion,
} from '../../src/module-system/promotion.js';
import { InMemoryLockStore } from '../../src/cache/redis-lock-store.js';

function makeFixture(): {
  staging: string;
  live: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), 'swastik-lock-'));
  const staging = join(root, 'staging');
  const live = join(root, 'live');
  mkdirSync(staging, { recursive: true });
  mkdirSync(live, { recursive: true });
  return {
    staging,
    live,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function writeModule(
  staging: string,
  slug: string,
  version: string,
  indexSource = 'export const x = 1;\n',
): string {
  const dir = join(staging, `${slug}__${version}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      name: slug,
      version,
      description: 'test module',
      tier: 'standard',
      required: false,
    }),
    'utf8',
  );
  writeFileSync(join(dir, 'index.js'), indexSource, 'utf8');
  return dir;
}

describe('UR-C-14 promotion lock (blueprint §15.8 / DIAGRAM 15-B)', () => {
  test('promoteUnderLock acquires and releases the module lock, so a later promotion succeeds', async () => {
    const { staging, live, cleanup } = makeFixture();
    const store = new InMemoryLockStore();
    try {
      const staged = writeModule(staging, 'moderation', '1.0.0');
      const first = await promoteUnderLock({
        lockStore: store,
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: staged,
      });
      expect(first.previousTarget).toBeNull();
      expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.0.0');

      const v2 = writeModule(staging, 'moderation', '1.1.0');
      const second = await promoteUnderLock({
        lockStore: store,
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: v2,
      });
      expect(second.previousTarget).toBe(staged);
      expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.1.0');
    } finally {
      cleanup();
    }
  });

  test('promoteUnderLock refuses a contended lock with PromotionLockedError and the volume stays untouched', async () => {
    const { staging, live, cleanup } = makeFixture();
    const store = new InMemoryLockStore();
    try {
      const staged = writeModule(staging, 'moderation', '1.0.0');
      const acquired = await store.setNX(
        `${PROMOTION_LOCK_KEY_PREFIX}moderation`,
        'other-owner',
        30_000,
      );
      expect(acquired).toBe(true);

      await expect(
        promoteUnderLock({
          lockStore: store,
          liveVolume: live,
          stagingVolume: staging,
          moduleSlug: 'moderation',
          stagingDir: staged,
        }),
      ).rejects.toBeInstanceOf(PromotionLockedError);
      expect(existsSync(join(live, 'moderation'))).toBe(false);
      expect(existsSync(join(live, 'moderation__incoming'))).toBe(false);
    } finally {
      cleanup();
    }
  });

  test('promoteUnderLock releases the lock even when the underlying promotion throws', async () => {
    const { staging, live, cleanup } = makeFixture();
    const store = new InMemoryLockStore();
    try {
      const staged = writeModule(staging, 'moderation', '1.0.0');
      await expect(
        promoteUnderLock({
          lockStore: store,
          liveVolume: live,
          stagingVolume: staging,
          moduleSlug: 'moderation',
          stagingDir: join(staging, 'moderation__9.9.9'),
        }),
      ).rejects.toThrow(/staged directory missing/);

      const ok = await promoteUnderLock({
        lockStore: store,
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: staged,
      });
      expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.0.0');
      void ok;
    } finally {
      cleanup();
    }
  });

  test('post-flip containment: the live link resolves to the promoted staging dir, never a real directory', () => {
    const { staging, live, cleanup } = makeFixture();
    try {
      const staged = writeModule(staging, 'moderation', '1.0.0');
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: staged,
      });
      expect(readlinkSync(join(live, 'moderation'))).toBe(staged);

      const hardLink = join(live, 'hardening');
      mkdirSync(hardLink, { recursive: true });
      const v2 = writeModule(staging, 'hardening', '1.0.0');
      expect(() =>
        promoteAtomically({
          liveVolume: live,
          stagingVolume: staging,
          moduleSlug: 'hardening',
          stagingDir: v2,
        }),
      ).toThrow(/real file or directory, not a staging-contained symlink/);
    } finally {
      cleanup();
    }
  });

  test('dangling rollback link is classified via lstatSync and cleaned up on the next promotion', () => {
    const { staging, live, cleanup } = makeFixture();
    try {
      const v1 = writeModule(staging, 'moderation', '1.0.0');
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: v1,
      });
      const v2 = writeModule(staging, 'moderation', '1.1.0');
      const second = promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: v2,
      });
      expect(second.rollbackLink).not.toBeNull();
      expect(readlinkSync(join(live, 'moderation__rollback'))).toBe(v1);

      rmSync(v1, { recursive: true, force: true });
      expect(lstatSync(join(live, 'moderation__rollback')).isSymbolicLink()).toBe(true);

      const v3 = writeModule(staging, 'moderation', '1.2.0');
      const third = promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: v3,
      });
      expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.2.0');
      expect(readlinkSync(join(live, 'moderation__rollback'))).toBe(v2);

      rollbackPromotion(third);
      expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.1.0');
    } finally {
      cleanup();
    }
  });
});

describe('UR-C-14 structural gates', () => {
  const promotionSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'module-system', 'promotion.ts'),
    'utf8',
  );
  const swastikSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'entry', 'swastik.ts'),
    'utf8',
  );

  test('promotion runs under the swastik:promote:{slug} lock (SET NX), so it never interleaves with a restart', () => {
    expect(promotionSource).toContain(
      "export const PROMOTION_LOCK_KEY_PREFIX = 'swastik:promote:'",
    );
    expect(promotionSource).toContain('lockStore.setNX(lockKey, lockOwner, lockTtlMs)');
    expect(promotionSource).toContain('throw new PromotionLockedError(slug)');
  });

  test('the unlocked primitive is never installed as a route; both Swastik paths promote only under the lock', () => {
    expect(swastikSource).toContain('promoteUnderLock({');
    expect(swastikSource).toContain('new RedisLockStore(lockRedis)');
    expect(swastikSource.replace(/promoteUnderLock/gi, '')).not.toContain('promoteAtomically(');
  });

  test('post-flip containment and dangling-link detection use lstatSync/isSymbolicLink', () => {
    expect(promotionSource).toContain('lstatSync(path).isSymbolicLink()');
    expect(promotionSource).toContain('assertPostFlipContainment(');
  });
});
