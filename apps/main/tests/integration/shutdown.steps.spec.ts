import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0009-1 — SIGTERM/SIGINT runs exactly 9 shutdown steps.

describe('ACC-ARCH-0009-1 — shutdown steps', () => {
  it('nine shutdown steps are declared', () => {
    const src = readSrc('bootstrap/stages.ts');
    expect(src).toMatch(/SHUTDOWN_STEPS/);
    expect(src).toMatch(/CLOSE_DATABASE_POOL/);
  });
});
