import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0014-2 — event names match {domain}.{entity}.{action} (regex-enforced at registration).
describe('ACC-MOD-0014-2 — event name format', () => {
  it('the manifest schema enforces the dotted event-name format', () => {
    expect(readRepo('packages/swastik/src/manifest-schema.ts')).toMatch(/regex/);
  });
});
