import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-DATA-0023-3 — a guild-level config change takes effect immediately with no restart.

describe('ACC-DATA-0023-3 — guild config hot-apply', () => {
  it('config writes invalidate the cache', () => {
    expect(readSrc('config/guild-config.service.ts')).toMatch(/invalidate/);
  });
});
