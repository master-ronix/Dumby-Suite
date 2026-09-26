import { test, expect, describe } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decidePromotionGate,
  promoteAtomically,
  rollbackPromotion,
  verifyStagedBuild,
} from '../../src/module-system/promotion.js';

function makeFixture(): {
  staging: string;
  live: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), 'swastik-promo-'));
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

test('verified load: a valid staged build passes and returns its parsed manifest', () => {
  const { staging, live, cleanup } = makeFixture();
  try {
    writeModule(staging, 'moderation', '1.0.0');
    const result = verifyStagedBuild({
      stagingVolume: staging,
      moduleSlug: 'moderation',
      version: '1.0.0',
    });
    expect(result.ok).toBe(true);
    expect(result.manifest?.name).toBe('moderation');
    expect(result.manifest?.version).toBe('1.0.0');
    void live;
  } finally {
    cleanup();
  }
});

test('verified load: a module with a syntax-broken index never passes verification', () => {
  const { staging, cleanup } = makeFixture();
  try {
    writeModule(staging, 'moderation', '1.0.0', 'export const broken = ;\n');
    const result = verifyStagedBuild({
      stagingVolume: staging,
      moduleSlug: 'moderation',
      version: '1.0.0',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('static load verification');
  } finally {
    cleanup();
  }
});

test('verified load: missing manifest or index file fails verification', () => {
  const { staging, cleanup } = makeFixture();
  try {
    const dir = join(staging, 'moderation__1.0.0');
    mkdirSync(dir, { recursive: true });
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'moderation', version: '1.0.0' }).ok,
    ).toBe(false);
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ name: 'moderation', version: '1.0.0' }),
      'utf8',
    );
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: 'moderation', version: '1.0.0' }).ok,
    ).toBe(false);
  } finally {
    cleanup();
  }
});

test('verified load: manifest/version mismatch fails verification', () => {
  const { staging, cleanup } = makeFixture();
  try {
    const dir = join(staging, 'moderation__1.0.0');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ name: 'other', version: '2.0.0' }),
      'utf8',
    );
    writeFileSync(join(dir, 'index.js'), 'export const x = 1;\n', 'utf8');
    const result = verifyStagedBuild({
      stagingVolume: staging,
      moduleSlug: 'moderation',
      version: '1.0.0',
    });
    expect(result.ok).toBe(false);
  } finally {
    cleanup();
  }
});

test('path containment: traversal refs fail verification and promotion never escapes live volume', () => {
  const { staging, cleanup } = makeFixture();
  try {
    expect(
      verifyStagedBuild({ stagingVolume: staging, moduleSlug: '../escape', version: '1.0.0' }).ok,
    ).toBe(false);
    expect(() =>
      promoteAtomically({
        liveVolume: staging,
        stagingVolume: staging,
        moduleSlug: 'mm',
        stagingDir: '/etc',
      }),
    ).toThrow();
  } finally {
    cleanup();
  }
});

test('atomic promotion: first promotion points live at the staged dir; a failed promote leaves volume untouched', () => {
  const { staging, live, cleanup } = makeFixture();
  try {
    const staged = writeModule(staging, 'moderation', '1.0.0');
    const outcome = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'moderation',
      stagingDir: staged,
    });
    expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('moderation');
    expect(outcome.previousTarget).toBeNull();
    expect(outcome.rollbackLink).toBeNull();

    expect(() =>
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: join(staging, 'moderation__9.9.9'),
      }),
    ).toThrow();
    expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.0.0');
    expect(existsSync(join(live, 'moderation__incoming'))).toBe(false);
  } finally {
    cleanup();
  }
});

test('atomic promotion: update replaces live atomically and rollback restores the prior target', () => {
  const { staging, live, cleanup } = makeFixture();
  try {
    const v1 = writeModule(staging, 'moderation', '1.0.0', 'export const v = 1;\n');
    const first = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'moderation',
      stagingDir: v1,
    });

    const v2 = writeModule(staging, 'moderation', '1.1.0', 'export const v = 2;\n');
    const second = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'moderation',
      stagingDir: v2,
    });
    expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.1.0');
    expect(second.previousTarget).toBe(v1);
    expect(second.rollbackLink).not.toBeNull();
    expect(existsSync(join(live, 'moderation__rollback'))).toBe(true);

    rollbackPromotion(second);
    expect(readFileSync(join(live, 'moderation', 'manifest.json'), 'utf8')).toContain('1.0.0');
    void first;
  } finally {
    cleanup();
  }
});

test('atomic promotion: first-promotion rollback removes the live link entirely', () => {
  const { staging, live, cleanup } = makeFixture();
  try {
    const staged = writeModule(staging, 'moderation', '1.0.0');
    const outcome = promoteAtomically({
      liveVolume: live,
      stagingVolume: staging,
      moduleSlug: 'moderation',
      stagingDir: staged,
    });
    rollbackPromotion(outcome);
    expect(existsSync(join(live, 'moderation'))).toBe(false);
  } finally {
    cleanup();
  }
});

test('a live entry that is not a staging-contained symlink is refused (fail closed)', () => {
  const { staging, live, cleanup } = makeFixture();
  try {
    const staged = writeModule(staging, 'moderation', '1.0.0');
    symlinkSync('/etc', join(live, 'moderation'));
    expect(() =>
      promoteAtomically({
        liveVolume: live,
        stagingVolume: staging,
        moduleSlug: 'moderation',
        stagingDir: staged,
      }),
    ).toThrow(/not a staging-contained symlink/);
  } finally {
    cleanup();
  }
});

test('ADR-006: first promotion requires human approval; updates auto-approve on diff basis', () => {
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: false })).toEqual({
    allowed: false,
    reason: expect.stringContaining('human approval'),
  });
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: true })).toEqual({
    allowed: true,
    gate: 'human',
  });
  expect(decidePromotionGate({ isFirstPromotion: false, humanApproved: false })).toEqual({
    allowed: true,
    gate: 'diff',
  });
});

describe('M6 structural gates', () => {
  const swastikSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'entry', 'swastik.ts'),
    'utf8',
  );
  const loaderSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'module-system', 'swastik-loader.ts'),
    'utf8',
  );

  test('swastik promotes only through the shared atomic helper, never a hand-rolled unlink+symlink swap', () => {
    expect(swastikSource).toContain('promoteUnderLock({');
    expect(swastikSource).not.toContain('symlinkSync(stagingDir, liveLink)');
    expect(swastikSource).not.toContain('symlinkSync(versionDir, liveLink)');
  });

  test('both promotion paths run verified loads and the ADR-006 gate first', () => {
    expect(swastikSource).toContain('verifyStagedBuild({');
    expect(swastikSource).toContain('decidePromotionGate');
    expect(swastikSource).toContain('isFirstPromotion');
    expect(swastikSource).toContain('BUILD_PROMOTION_REFUSED');
  });

  test('manifest reading is static extraction (D-4.9 import-block, unlike runtime module execution)', () => {
    expect(loaderSource).toContain('JSON.parse(readFileSync(manifestPath');
    expect(loaderSource).not.toContain('await import(pathToFileURL(manifestPath)');
  });

  test('discovery never scans promotion temp or rollback links', () => {
    expect(loaderSource).toContain("entry.endsWith('__rollback')");
    expect(loaderSource).toContain("entry.endsWith('__incoming')");
  });
});
