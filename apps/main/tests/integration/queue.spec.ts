import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0009-1 — /queue shows the guild command-change queue state.

describe('ACC-REQ-0009-1 — queue command', () => {
  it('the queue module package exists', () => {
    expect(isDir('packages/modules/queue')).toBe(true);
  });
});
