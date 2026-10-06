import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0010-1 — /persona manages Twill personas (one persona = one server).

describe('ACC-REQ-0010-1 — persona command', () => {
  it('the persona module package exists', () => {
    expect(isDir('packages/modules/persona')).toBe(true);
  });
});
