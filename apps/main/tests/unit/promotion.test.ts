import { test, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readlinkSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  verifyStagedBuild,
  decidePromotionGate,
  promoteAtomically,
  promoteUnderLock,
  rollbackPromotion,
  PromotionLockedError,
} from '../../src/module-system/promotion.js';

const validManifest = {
  name: 'hello',
  version: '1.0.0',
  description: 'd',
  tier: 'standard',
  hardcoded: false,
  devId: 'dev',
  buildId: 'b',
  visibility: 'public',
  releaseStatus: 'public',
};

const tmp = () => mkdtempSync(join(tmpdir(), 'promo-'));

test('decidePromotionGate requires human approval for a first promotion', () => {
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: false })).toStrictEqual({
    allowed: false,
    reason: expect.any(String),
  });
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: true })).toStrictEqual({
    allowed: true,
    gate: 'human',
  });
  expect(decidePromotionGate({ isFirstPromotion: false, humanApproved: false })).toStrictEqual({
    allowed: true,
    gate: 'diff',
  });
});

test('verifyStagedBuild walks slug, version, directory, files, manifest and syntax', () => {
  const staging = tmp();
  try {
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'Bad Slug', version: '1.0.0' }).ok,
    ).toBe(false);
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: 'nope' }).ok,
    ).toBe(false);
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    const dir = join(staging, 'hello__1.0.0');
    mkdirSync(dir);
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(validManifest));
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    writeFileSync(join(dir, 'index.js'), '');
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    writeFileSync(join(dir, 'index.js'), 'export const x = 1;\n');
    const ok = verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' });
    expect(ok.ok).toBe(true);
    expect(ok.manifest?.name).toBe('hello');
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
});

test('verifyStagedBuild rejects name/version mismatch and a malformed manifest', () => {
  const staging = tmp();
  try {
    const dir = join(staging, 'hello__1.0.0');
    mkdirSync(dir);
    writeFileSync(join(dir, 'index.js'), 'export const x = 1;\n');

    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ ...validManifest, name: 'other' }));
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ ...validManifest, version: '2.0.0' }),
    );
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);

    writeFileSync(join(dir, 'manifest.json'), '{ not json');
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'hello', version: '1.0.0' }).ok,
    ).toBe(false);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
});

test('promoteAtomically flips the live symlink and supports rollback', () => {
  const staging = tmp();
  const live = tmp();
  try {
    const dir = join(staging, 'hello__1.0.0');
    mkdirSync(dir);
    const out = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'hello',
      stagingDir: dir,
    });
    expect(existsSync(out.liveLink)).toBe(true);
    expect(readlinkSync(out.liveLink)).toBe(dir);
    expect(out.previousTarget).toBeNull();

    const dir2 = join(staging, 'hello__1.1.0');
    mkdirSync(dir2);
    const out2 = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'hello',
      stagingDir: dir2,
    });
    expect(out2.previousTarget).toBe(dir);
    expect(out2.rollbackLink).not.toBeNull();

    rollbackPromotion(out2);
    expect(readlinkSync(out2.liveLink)).toBe(dir);
  } finally {
    rmSync(staging, { recursive: true, force: true });
    rmSync(live, { recursive: true, force: true });
  }
});

test('promoteAtomically refuses a missing staged dir and a non-symlink live entry', () => {
  const staging = tmp();
  const live = tmp();
  try {
    expect(() =>
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'hello',
        stagingDir: join(staging, 'hello__9.9.9'),
      }),
    ).toThrow(/missing/);

    writeFileSync(join(live, 'hello'), 'x');
    const dir = join(staging, 'hello__1.0.0');
    mkdirSync(dir);
    expect(() =>
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'hello',
        stagingDir: dir,
      }),
    ).toThrow(/real file/);
  } finally {
    rmSync(staging, { recursive: true, force: true });
    rmSync(live, { recursive: true, force: true });
  }
});

test('promoteUnderLock refuses a held lock and releases the lock on success', async () => {
  const staging = tmp();
  const live = tmp();
  try {
    const dir = join(staging, 'hello__1.0.0');
    mkdirSync(dir);

    const held = { setNX: vi.fn().mockResolvedValue(false), release: vi.fn() };
    await expect(
      promoteUnderLock({
        lockStore: held as never,
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'hello',
        stagingDir: dir,
      }),
    ).rejects.toBeInstanceOf(PromotionLockedError);

    const free = {
      setNX: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
    };
    const out = await promoteUnderLock({
      lockStore: free as never,
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'hello',
      stagingDir: dir,
    });
    expect(existsSync(out.liveLink)).toBe(true);
    expect(free.release).toHaveBeenCalled();
  } finally {
    rmSync(staging, { recursive: true, force: true });
    rmSync(live, { recursive: true, force: true });
  }
});
