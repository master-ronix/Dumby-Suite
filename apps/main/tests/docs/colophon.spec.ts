import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REF-0010-1 — the colophon states the correct document version and lineage.
describe('ACC-REF-0010-1 — colophon', () => {
  it('states version 5.0.0 and its lineage', () => {
    const body = readRepo('docs/spec/reference/colophon.md');
    expect(body).toContain('5.0.0');
  });
});
