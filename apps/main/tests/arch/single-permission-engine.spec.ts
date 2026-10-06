import { describe, expect, it } from 'vitest';
import { srcFiles } from '../spec-utils.js';
// ACC-REQ-0021-5 — one resolver is shared by the bot and the MDIS dashboard (no second implementation).
describe('ACC-REQ-0021-5 — single permission engine', () => {
  it('exactly one resolver file exists', () => {
    const hits = srcFiles()
      .filter((f) => f.path.endsWith('permissions/resolver.ts'))
      .map((f) => f.path);
    expect(hits.length).toBe(1);
  });
});
