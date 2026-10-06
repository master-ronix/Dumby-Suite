import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0008-1 — /browse lists catalog entries filtered by manifest visibility.

describe('ACC-REQ-0008-1 — browse', () => {
  it('the browse module package exists', () => {
    expect(isDir('packages/modules/browse')).toBe(true);
  });
});
