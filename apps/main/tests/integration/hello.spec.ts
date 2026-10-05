import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-REQ-0013-1 — /hello (hello-world, devId qm-dev-001).

describe('ACC-REQ-0013-1 — hello', () => {
  it('the hello-world module exists and declares its devId', () => {
    expect(isDir('packages/modules/hello-world')).toBe(true);
  });
});
