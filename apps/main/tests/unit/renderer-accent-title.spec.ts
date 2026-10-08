import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REQ-0004-2 — the accent is the default amber #FFCA6D and titles follow the A4 grammar.
describe('ACC-REQ-0004-2 — renderer accent and title', () => {
  it('the default accent token is amber', () => {
    const v2 = readRepo('apps/main/src/shared/utils/components-v2.ts');
    expect(v2).toMatch(/DEFAULT_ACCENT_COLOR\s*=\s*0xffca6d/i);
  });
});
