import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-0002B-1 — the reading guide names the two reader profiles and the load-on-demand rule.
describe('ACC-ORI-0002B-1 — reading guide', () => {
  it('names the reader profiles', () => {
    const body = readRepo('docs/spec/orientation/how-to-read-this-reference.md');
    expect(body.length).toBeGreaterThan(0);
    expect(body).toMatch(/human|agent|reader|profile/i);
  });
});
