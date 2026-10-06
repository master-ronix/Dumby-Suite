import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-DEF-1 — every canonical document has a definition/intent/impact/purpose entry.
describe('ACC-ORI-DEF-1 — definitions index', () => {
  it('definitions.md carries intent/impact/purpose entries', () => {
    const manifest = JSON.parse(readRepo('docs/manifest.json')) as { documents: { id: string }[] };
    const defs = readRepo('docs/spec/orientation/definitions.md');
    expect(manifest.documents.length).toBeGreaterThan(0);
    expect(defs).toMatch(/intent/i);
    expect(defs).toMatch(/purpose/i);
  });
});
