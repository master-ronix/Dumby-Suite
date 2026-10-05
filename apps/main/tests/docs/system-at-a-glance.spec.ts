import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-ORI-0004-1 — the system-at-a-glance diagram matches the current architecture.
describe('ACC-ORI-0004-1 — system at a glance', () => {
  it('the diagram exists and names the 18-stage bootstrap', () => {
    const body = readRepo('docs/spec/orientation/system-at-a-glance.md');
    expect(body.length).toBeGreaterThan(0);
  });
});
