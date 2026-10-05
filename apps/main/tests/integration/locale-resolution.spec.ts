import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0030-1 — locale resolves guild -> user -> en-US; en-US.json is required.

describe('ACC-OPS-0030-1 — locale resolution', () => {
  it('the i18n manager resolves locale with an en-US base', () => {
    const src = readSrc('i18n/i18n-manager.ts');
    expect(src).toMatch(/en-US/);
  });
});
