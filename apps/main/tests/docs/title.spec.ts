import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-0001-1 — the document title matches the current reference (Dumby Framework, 5.0.0).
describe('ACC-ORI-0001-1 — document title', () => {
  it('names Dumby Framework at version 5.0.0', () => {
    const body = readRepo('docs/spec/orientation/front-matter.md');
    expect(body).toMatch(/DUMBY FRAMEWORK/i);
    expect(body).toContain('5.0.0');
  });
});
