import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0009-2 — worst-case shutdown sum is 180 s and the process calls process.exit(0).

describe('ACC-ARCH-0009-2 — shutdown ceiling', () => {
  it('the shutdown sequence exits the process', () => {
    expect(readSrc('shutdown/shutdown.ts')).toMatch(/process\.exit/);
  });
});
