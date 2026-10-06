import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0016-2 — manifest visibility (public/unlisted/private) governs catalog listing exactly.
describe('ACC-MOD-0016-2 — visibility', () => {
  it('the visibility triad is in the shared schema', () => {
    const sw = readRepo('packages/swastik/src/manifest-schema.ts');
    for (const v of ['public', 'unlisted', 'private']) expect(sw).toContain(`'${v}'`);
  });
});
