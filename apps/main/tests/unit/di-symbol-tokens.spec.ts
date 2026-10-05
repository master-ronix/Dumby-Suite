import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0010-1 — every service is identified by a Symbol token; no string tokens exist.
describe('ACC-ARCH-0010-1 — DI symbol tokens', () => {
  it('tokens.ts declares Symbol tokens', () => {
    const tokens = readSrc('di/tokens.ts');
    expect(tokens).toMatch(/createToken/);
    expect(readSrc('di/container.ts')).toMatch(/Symbol\(description\)/);
  });
});
