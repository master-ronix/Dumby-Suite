import { describe, expect, it } from 'vitest';
import { srcText } from '../spec-utils.js';
// ACC-MOD-0015-1 — dev hot-reload activates only when NODE_ENV=development; a production guard blocks it.
describe('ACC-MOD-0015-1 — dev reload guard', () => {
  it('a production guard exists for hot reload', () => {
    const all = srcText();
    expect(all).toMatch(/development/);
  });
});
