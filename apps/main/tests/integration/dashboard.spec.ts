import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0006-1 — /dashboard renders the documented frame in Mode D with edit-in-place navigation.

describe('ACC-REQ-0006-1 — dashboard', () => {
  it('the dashboard module package exists', () => {
    expect(isDir('packages/modules/dashboard')).toBe(true);
  });
});
