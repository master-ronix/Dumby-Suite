import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0012-3 — eventsCatalog is current for every event the module emits.
describe('ACC-MOD-0012-3 — events catalog', () => {
  it('the manifest carries an eventsCatalog field', () => {
    expect(readRepo('packages/swastik/src/manifest-schema.ts')).toMatch(/eventsCatalog/);
  });
});
