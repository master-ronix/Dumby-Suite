import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REQ-0000-1 — the interface reference identity block states version 5.0.0 and its scope.
describe('ACC-REQ-0000-1 — interface identity', () => {
  it('states version 5.0.0', () => {
    const body = readRepo('docs/spec/request-layer/front-matter.md');
    expect(body).toContain('5.0.0');
  });
});
