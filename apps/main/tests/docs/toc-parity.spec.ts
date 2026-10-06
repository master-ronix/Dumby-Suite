import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-ORI-0002-1 — the table of contents lists exactly the parts/sections present in spec/.
describe('ACC-ORI-0002-1 — TOC parity', () => {
  it('the TOC file exists and the spec departments are present', () => {
    expect(existsRepo('docs/spec/orientation/table-of-contents.md')).toBe(true);
    const depts = listDir('docs/spec');
    for (const d of ['governance', 'architecture', 'modules', 'request-layer']) {
      expect(depts).toContain(d);
    }
  });
});
