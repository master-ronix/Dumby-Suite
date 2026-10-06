import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-REQ-0003-1 — the Core Command Surface is exactly /dashboard /health /browse /queue /persona /permit /modules /hello.

describe('ACC-REQ-0003-1 — core command surface', () => {
  it('the eight first-party modules exist', () => {
    const mods = listDir('packages/modules');
    for (const m of [
      'dashboard',
      'health',
      'browse',
      'queue',
      'persona',
      'permit',
      'modules',
      'hello-world',
    ]) {
      expect(mods, m).toContain(m);
    }
  });
});
