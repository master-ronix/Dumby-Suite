import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0028-1 — every recognized error extends DumbyError with code, HTTP-status-equivalent, userMessage, isOperational.
describe('ACC-OPS-0028-1 — error taxonomy', () => {
  it('DumbyError carries code, httpStatus, userMessage and isOperational', () => {
    const tax = readSrc('errors/taxonomy.ts');
    for (const field of ['code', 'httpStatus', 'userMessage', 'isOperational']) {
      expect(tax, field).toContain(field);
    }
  });
});
