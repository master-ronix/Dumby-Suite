import { describe, expect, it } from 'vitest';
import { moduleManifestSchema as fromSwastik } from '@workspace/swastik/manifest';
import { moduleManifestSchema as fromBot } from '../../src/module-system/manifest.schema.js';
import { validateManifest, parseManifest } from '@workspace/swastik/validate';

/**
 * ACC-MOD-0011-2 — "The same manifest schema is imported by both Swastik upload validation and the
 * bot Stage 11 validator (no drift)."
 *
 * Before this the two sides had separate definitions — a hand-written TS interface in
 * `packages/swastik/src/manifest.ts` and a Zod schema in the bot — and they had drifted. The schema
 * now lives in the Swastik package and the bot re-exports it, so the identity check below is the
 * guard against a future second copy.
 */
describe('ACC-MOD-0011-2 — one schema, two validators, no drift', () => {
  it('the bot imports the very same schema object, not a copy', () => {
    expect(fromBot).toBe(fromSwastik);
  });

  it('Swastik upload validation and the bot Stage 11 validator agree on a valid manifest', () => {
    const manifest = {
      name: 'agree-mod',
      version: '1.0.0',
      description: 'A module both sides must accept.',
      tier: 'core',
      hardcoded: false,
      devId: 'dev_first_party',
      buildId: 'build_agree_1_0_0',
      visibility: 'public',
      releaseStatus: 'public',
    };
    expect(validateManifest(manifest).valid).toBe(true);
    expect(() => parseManifest(manifest)).not.toThrow();
  });

  it('they agree on an invalid manifest too — the same drift would show up here', () => {
    const manifest = {
      name: 'agree-mod',
      version: '1.0.0',
      description: 'Missing its identity fields.',
      tier: 'core',
      hardcoded: false,
      releaseStatus: 'public',
    };
    expect(validateManifest(manifest).valid).toBe(false);
    expect(() => parseManifest(manifest)).toThrow();
  });
});
