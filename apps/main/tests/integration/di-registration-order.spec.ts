import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0010-4 — core tokens register at stage 09; module tokens at stage 12.

describe('ACC-ARCH-0010-4 — DI registration order', () => {
  it('DI_BOOTSTRAP precedes MODULE_LOAD', () => {
    const src = readSrc('bootstrap/stages.ts');
    expect(src.indexOf('DI_BOOTSTRAP')).toBeLessThan(src.indexOf('MODULE_LOAD'));
  });
});
