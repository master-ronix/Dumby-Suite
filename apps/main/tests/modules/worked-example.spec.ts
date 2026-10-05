import { describe, expect, it } from 'vitest';
import { isDir } from '../spec-utils.js';
// ACC-MOD-0012-2 — a module ships a unit test per service and an integration test per DB-touching path.
describe('ACC-MOD-0012-2 — worked example', () => {
  it('each first-party module package carries tests', () => {
    for (const m of [
      'dashboard',
      'health',
      'browse',
      'queue',
      'persona',
      'permit',
      'modules',
      'hello-world',
    ]) {
      expect(isDir(`packages/modules/${m}/tests`), `missing tests for ${m}`).toBe(true);
    }
  });
});
