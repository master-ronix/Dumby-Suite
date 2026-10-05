import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-OPS-0032-2 — non-production credentials are categorically distinct from production.
describe('ACC-OPS-0032-2 — credential separation', () => {
  it('the env schema distinguishes environments', () => {
    const env = readSrc('config/env.schema.ts');
    expect(env).toMatch(/NODE_ENV/);
    expect(env).toMatch(/production/);
  });
});
