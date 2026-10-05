import { describe, expect, it } from 'vitest';
import { srcFiles } from '../spec-utils.js';
// ACC-ARCH-0010-2 — dependencies arrive only via constructor injection; no service-locator calls exist.
describe('ACC-ARCH-0010-2 — no service locator', () => {
  it('no service-locator symbol exists in src/', () => {
    const hits = srcFiles()
      .filter((f) => /\bServiceLocator\b|serviceLocator\s*\(/.test(f.source))
      .map((f) => f.path);
    expect(hits).toEqual([]);
  });
});
