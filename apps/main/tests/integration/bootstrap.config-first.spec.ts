import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0008-2 — config is Zod-validated at stage 02 before any gateway connection (stage 15).

describe('ACC-ARCH-0008-2 — config first', () => {
  it('CONFIG_LOAD precedes DISCORD_LOGIN', () => {
    const src = readSrc('bootstrap/stages.ts');
    expect(src.indexOf('CONFIG_LOAD')).toBeLessThan(src.indexOf('DISCORD_LOGIN'));
  });
});
