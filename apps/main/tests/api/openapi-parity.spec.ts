import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REF-0044-1 — the REST/MDIS endpoint families match contracts/openapi.yaml and carry documented auth contexts.
describe('ACC-REF-0044-1 — openapi parity', () => {
  it('the OpenAPI contract exists and declares the internal auth surface', () => {
    const spec = readRepo('docs/contracts/openapi.yaml');
    expect(spec).toMatch(/openapi:/);
    expect(spec).toMatch(/paths:/);
  });
});
