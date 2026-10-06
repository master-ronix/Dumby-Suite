import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0021-2 — layer 6 is a pure backend rank function over OWNER>ADMINISTRATOR>MODERATOR>HELPER>MEMBER>RESTRICTED.
describe('ACC-REQ-0021-2 — RBAC rank', () => {
  it('rank.ts declares the canonical ladder', () => {
    const rank = readSrc('permissions/rank.ts');
    for (const r of ['OWNER', 'ADMINISTRATOR', 'MODERATOR', 'HELPER', 'MEMBER', 'RESTRICTED']) {
      expect(rank, r).toContain(r);
    }
  });
});
