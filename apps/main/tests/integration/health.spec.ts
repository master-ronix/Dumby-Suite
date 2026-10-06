import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0007-1 — /health returns Ping/Latency via Components V2.

describe('ACC-REQ-0007-1 — health command', () => {
  it('the health module package exists', () => {
    expect(isDir('packages/modules/health')).toBe(true);
  });
});
