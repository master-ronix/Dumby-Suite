import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-ARCH-0010-5 — PermissionResolver is resolved in the live request path.

describe('ACC-ARCH-0010-5 — resolver wired', () => {
  it('the command router invokes the resolver', () => {
    expect(readSrc('commands/command-router.ts')).toMatch(/permissionResolver\?\.resolve/);
  });
});
