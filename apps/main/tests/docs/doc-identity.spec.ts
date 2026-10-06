import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-0000-1 — the document identity block states type, project, version 5.0.0, stack, and scope.
describe('ACC-ORI-0000-1 — document identity block', () => {
  it('declares type, project and version', () => {
    const body = readRepo('docs/spec/orientation/front-matter.md');
    expect(body).toMatch(/Document type/);
    expect(body).toMatch(/Project/);
    expect(body).toContain('5.0.0');
  });
});
