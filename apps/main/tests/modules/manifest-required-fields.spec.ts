import { describe, expect, it } from 'vitest';
import { validateManifest } from '@workspace/swastik/validate';
/**
 * ACC-MOD-0011-3 — "Omitting `tier` (or any required field) fails validation and the process does
 * not start."
 *
 * Authority: docs/spec/modules/module-anatomy-manifest.md. The contract's `required` list is
 * name, version, description, tier, hardcoded, devId, buildId, visibility, releaseStatus.
 */
const valid = {
  name: 'required-mod',
  version: '1.0.0',
  description: 'A module used to prove the required fields.',
  tier: 'core',
  hardcoded: false,
  devId: 'dev_first_party',
  buildId: 'build_required_1_0_0',
  visibility: 'public',
  releaseStatus: 'public',
};

const REQUIRED = [
  'name',
  'version',
  'description',
  'tier',
  'hardcoded',
  'devId',
  'buildId',
  'visibility',
  'releaseStatus',
] as const;

describe('ACC-MOD-0011-3 — required fields', () => {
  it('the complete manifest is valid', () => {
    expect(validateManifest(valid).valid).toBe(true);
  });

  for (const field of REQUIRED) {
    it(`omitting ${field} is invalid, and the error names it`, () => {
      const without: Record<string, unknown> = { ...valid };
      delete without[field];
      const result = validateManifest(without);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toContain(field);
    });
  }

  it('omitting tier specifically is invalid (the spec calls this case out)', () => {
    const without: Record<string, unknown> = { ...valid };
    delete without['tier'];
    expect(validateManifest(without).valid).toBe(false);
  });
});
