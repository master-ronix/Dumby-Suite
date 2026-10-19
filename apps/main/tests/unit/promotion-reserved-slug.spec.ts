import { test, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promoteAtomically } from '../../src/module-system/promotion.js';

/** A live volume, a staging volume, and a staged module dir inside the staging volume. */
function setup() {
  const liveVolume = mkdtempSync(join(tmpdir(), 'live-'));
  const stagingVolume = mkdtempSync(join(tmpdir(), 'stage-'));
  const stagingDir = join(stagingVolume, 'hello-world__1.0.0');
  mkdirSync(stagingDir, { recursive: true });
  writeFileSync(join(stagingDir, 'index.js'), 'export const onLoad = () => 1;\n');
  return { liveVolume, stagingVolume, stagingDir };
}

test('UR-20261018-093/B: an exact baked slug is rejected at promotion', () => {
  const { liveVolume, stagingVolume, stagingDir } = setup();
  expect(() =>
    promoteAtomically({ liveVolume, stagingVolume, moduleSlug: 'hello-world', stagingDir, reservedSlugs: ['hello-world'] }),
  ).toThrow(/reserved slug/);
});

test('UR-20261018-093/B: a case-variant baked slug is rejected (case normalised)', () => {
  const { liveVolume, stagingVolume, stagingDir } = setup();
  expect(() =>
    promoteAtomically({ liveVolume, stagingVolume, moduleSlug: 'hello-world', stagingDir, reservedSlugs: ['HELLO-WORLD'] }),
  ).toThrow(/reserved slug/);
});

test('UR-20261018-093/B: a non-baked slug still promotes', () => {
  const { liveVolume, stagingVolume, stagingDir } = setup();
  const out = promoteAtomically({
    liveVolume, stagingVolume, moduleSlug: 'hello-world', stagingDir, reservedSlugs: ['something-else'],
  });
  expect(out.liveLink).toContain('hello-world');
});
