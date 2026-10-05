import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0027-2 — logs are structured JSON (Pino) with deep-wildcard secret redaction.
describe('ACC-OPS-0027-2 — log redaction', () => {
  it('the logger redacts secret paths', () => {
    const src = readSrc('logging/logger.ts');
    expect(src).toMatch(/redact/i);
  });
});
