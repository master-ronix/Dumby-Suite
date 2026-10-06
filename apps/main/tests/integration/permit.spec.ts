import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0011-1 — /permit manages Layer 6/7 grants in the RBAC vocabulary.

describe('ACC-REQ-0011-1 — permit command', () => {
  it('the permit module package exists', () => {
    expect(isDir('packages/modules/permit')).toBe(true);
  });
});
