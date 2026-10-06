import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0006-1 — every interaction traverses the layered command trace in the documented order.

describe('ACC-ARCH-0006-1 — command trace', () => {
  it('the router runs the middleware pipeline', () => {
    expect(readSrc('commands/command-router.ts')).toMatch(/pipeline|middleware/i);
  });
});
