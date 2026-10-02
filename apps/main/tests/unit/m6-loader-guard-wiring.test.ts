import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * Finding #23 — the loader's §15.8/§15.9 provenance guard is an injected `buildStore`+`verifier`;
 * the production call site must arm it. This asserts the wiring in `bootstrap.ts` (the armed path
 * itself is covered by the loader's own tests).
 */
const bootstrapSource = readFileSync(
  fileURLToPath(new URL('../../src/bootstrap/bootstrap.ts', import.meta.url)),
  'utf8',
);

describe('bootstrap arms the loader provenance guard (finding #23)', () => {
  test('a buildStore and verifier are constructed', () => {
    expect(bootstrapSource).toMatch(/new PostgresBuildStore\(db\.knex\)/);
    expect(bootstrapSource).toMatch(/new BuildSignatureVerifier\(\)/);
  });

  test('both are passed into the loadModulesFromTierVolumes call', () => {
    const callStart = bootstrapSource.indexOf('loadModulesFromTierVolumes({');
    expect(callStart).toBeGreaterThan(-1);
    const call = bootstrapSource.slice(callStart, callStart + 400);
    expect(call).toMatch(/buildStore/);
    expect(call).toMatch(/verifier/);
  });

  test('the verifier key is derived from the build-signing env', () => {
    expect(bootstrapSource).toMatch(/registerKey\(buildSigningKeyId/);
    expect(bootstrapSource).toMatch(/BUILD_SIGNING_KEY_ID/);
    expect(bootstrapSource).toMatch(/BUILD_SIGNING_PRIVATE_KEY/);
  });
});
