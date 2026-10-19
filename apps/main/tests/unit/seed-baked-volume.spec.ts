import { test, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedBakedVolume } from '../../src/module-system/seed-baked-volume.js';
import { hashFile } from '../../src/module-system/build-signing.js';
import type { Logger } from '../../src/logging/logger.js';

function logger(): Logger {
  const n = (): void => undefined;
  const l = { child: () => l, trace: n, debug: n, info: n, warn: n, error: n, fatal: n, setLevel: n };
  return l as unknown as Logger;
}

/** Writes a module dir (manifest + index.js) and returns its artifact hash. */
function module_(root: string, rel: string, body: string): string {
  const d = join(root, rel);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'manifest.json'), '{}');
  writeFileSync(join(d, 'index.js'), body);
  return hashFile(join(d, 'index.js'));
}

/** image tree + manifest; returns {image, volume, manifestPath, hash}. */
function fixture() {
  const image = mkdtempSync(join(tmpdir(), 'img-'));
  const volume = mkdtempSync(join(tmpdir(), 'vol-'));
  const hash = module_(image, 'modules-core/hello-world', 'export const onLoad = () => 1;\n');
  const manifestPath = join(image, 'baked-manifest.json');
  writeFileSync(manifestPath, JSON.stringify({ 'modules-core/hello-world': hash }));
  return { image, volume, manifestPath, hash };
}

test('UR-100/B: an empty volume is seeded from the image', () => {
  const { volume, manifestPath } = fixture();
  const r = seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  expect(r.seeded).toStrictEqual(['modules-core/hello-world']);
  expect(existsSync(join(volume, 'modules-core/hello-world/index.js'))).toBe(true);
  expect(existsSync(join(volume, '.baked-seed.json'))).toBe(true);
});

test('UR-100/B: a current copy is skipped; a stale copy is re-seeded', () => {
  const { volume, manifestPath } = fixture();
  seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  let r = seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  expect(r.skipped).toStrictEqual(['modules-core/hello-world']);
  // make the volume copy stale
  writeFileSync(join(volume, 'modules-core/hello-world/index.js'), 'export const onLoad = () => 999;\n');
  r = seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  expect(r.seeded).toStrictEqual(['modules-core/hello-world']);
  expect(readFileSync(join(volume, 'modules-core/hello-world/index.js'), 'utf8')).toContain('=> 1');
});

test('UR-100/B: a promoted slug (not in the manifest) is never touched', () => {
  const { volume, manifestPath } = fixture();
  module_(volume, 'modules-standard/community-thing__1.0.0', 'export const onLoad = () => 2;\n');
  const r = seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  expect(r.removed).toStrictEqual([]);
  expect(existsSync(join(volume, 'modules-standard/community-thing__1.0.0/index.js'))).toBe(true);
});

test('UR-100/B: a baked module removed from the image is removed from the volume', () => {
  const { volume, manifestPath } = fixture();
  seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() }); // records the seeded state
  // new image: manifest no longer lists hello-world
  writeFileSync(manifestPath, JSON.stringify({}));
  const r = seedBakedVolume({ modulesDir: volume, manifestPath, logger: logger() });
  expect(r.removed).toStrictEqual(['modules-core/hello-world']);
  expect(existsSync(join(volume, 'modules-core/hello-world'))).toBe(false);
});
