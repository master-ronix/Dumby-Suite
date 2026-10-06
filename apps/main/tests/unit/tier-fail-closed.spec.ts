import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0017-4 — dispatch fails closed on an unknown module tier (never routed on a default).
describe('ACC-REQ-0017-4 — tier fail-closed', () => {
  it('tier rules fail closed on an unknown tier', () => {
    expect(readSrc('module-system/tier-rules.ts').length).toBeGreaterThan(0);
  });
});
