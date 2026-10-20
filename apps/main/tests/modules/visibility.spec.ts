import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0016-2 — manifest visibility (public/unlisted/private) governs catalog listing exactly.
describe('ACC-MOD-0016-2 — visibility', () => {
  it('the visibility triad is in the shared schema', () => {
    // Quote-agnostic: the shared schema is formatted in the swastik package (double quotes),
    // so normalise before the membership check — the assertion is about the declared values,
    // not their quote style.
    const sw = readRepo('packages/swastik/src/manifest-schema.ts').replace(/"/g, "'");
    for (const v of ['public', 'unlisted', 'private']) expect(sw).toContain(`'${v}'`);
  });
});
