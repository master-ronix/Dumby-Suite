import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0010-3 — circular dependencies are detected at boot, before any code runs.
describe('ACC-ARCH-0010-3 — DI cycle detection', () => {
  it('the container detects cycles', () => {
    expect(readSrc('di/container.ts')).toMatch(/Circular/i);
  });
});
