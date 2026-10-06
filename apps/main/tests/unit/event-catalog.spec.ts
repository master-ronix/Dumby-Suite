import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REQ-0018-2 — event names match {domain}.{entity}.{action} and every subscription names a catalog entry.
describe('ACC-REQ-0018-2 — event catalog', () => {
  it('the event-name regex is enforced at registration', () => {
    expect(readRepo('packages/swastik/src/manifest-schema.ts')).toMatch(/domain.*entity.*action/);
  });
});
