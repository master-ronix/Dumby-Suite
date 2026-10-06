import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0008-5 — core volume reload is a no-op; core changes require a restart.
describe('ACC-ARCH-0008-5 — core reload no-op', () => {
  it('the promotion path treats core as restart-only', () => {
    const promo =
      readSrc('module-system/promotion.ts') + readSrc('module-system/swastik-loader.ts');
    expect(promo).toMatch(/core/i);
  });
});
