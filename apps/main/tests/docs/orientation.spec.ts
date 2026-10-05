import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-0001-1 — the orientation states document type, version, and authority.
describe('ACC-ORI-0001-1 — orientation identity', () => {
  it('states the document type, version and authority', () => {
    const body = readRepo('docs/spec/orientation/what-this-document-is.md');
    expect(body).toContain('5.0.0');
    expect(body).toMatch(/document/i);
  });
});
