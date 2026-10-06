import { describe, expect, it } from 'vitest';
import { readRepo, readSrc } from '../spec-utils.js';
// ACC-ARCH-0006-2 — cross-module interaction uses only the five sanctioned patterns; any other path fails lint.
describe('ACC-ARCH-0006-2 — cross-module patterns', () => {
  it('cross-module access is declared through the manifest', () => {
    expect(
      readSrc('module-system/manifest.schema.ts') +
        readRepo('packages/swastik/src/manifest-schema.ts'),
    ).toMatch(/crossModuleReads/);
  });
});
