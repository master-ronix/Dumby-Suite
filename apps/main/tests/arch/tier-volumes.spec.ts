import { describe, expect, it } from 'vitest';
import { readSrc, srcText } from '../spec-utils.js';
// ACC-ARCH-0005-4 — modules are served only from the four per-tier volumes at MODULES_DIR.
describe('ACC-ARCH-0005-4 — tier volumes', () => {
  it('MODULES_DIR defaults to /mnt/modules and the four volumes are referenced', () => {
    const env = readSrc('config/env.schema.ts');
    expect(env).toMatch(/MODULES_DIR/);
    expect(env).toContain('/mnt/modules');
    const all = srcText();
    for (const v of [
      'modules-admin',
      'modules-core',
      'modules-standard',
      'modules-marketplace',
      'swastik-staging',
    ]) {
      expect(all).toContain(v);
    }
  });
});
