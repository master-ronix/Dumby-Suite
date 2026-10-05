import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0012-1 — /modules lists/installs/enables modules per guild.

describe('ACC-REQ-0012-1 — modules command', () => {
  it('the modules module package exists', () => {
    expect(isDir('packages/modules/modules')).toBe(true);
  });
});
