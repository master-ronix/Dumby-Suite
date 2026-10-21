import { test, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  decidePromotionGate,
  promoteUnderLock,
  verifyStagedBuild,
} from '../../src/module-system/promotion.js';
import {
  BuildSignatureVerifier,
  readBuildProvenanceSidecar,
} from '../../src/module-system/build-signing.js';
import { signProvenance } from '../../src/module-system/sign-provenance.js';
import {
  TIER_VOLUME_NAMES,
  loadModulesFromTierVolumes,
} from '../../src/module-system/swastik-loader.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import type { Logger } from '../../src/logging/logger.js';

/**
 * The module deploy path, end to end — the composition `POST /internal/deploy` runs
 * (`src/entry/swastik.ts`): verify the staged build → promotion gate → sign provenance → promote
 * under lock (carrying the sidecar) → the loader accepts the promoted module with its provenance
 * verified.
 *
 * This is the seam a future refactor (extracting the orchestration into a shared function) must
 * preserve, so it is pinned here. It is hermetic — a temp staging volume, a temp live volume, an
 * in-memory lock and build store, and an ephemeral keypair — so it needs no database.
 */

const MANIFEST = {
  name: 'deployflow',
  version: '1.0.0',
  description: 'a module used to pin the deploy path',
  tier: 'standard',
  hardcoded: false,
  devId: 'dev_first_party',
  visibility: 'public',
  releaseStatus: 'public',
} as const;

const INDEX_SOURCE =
  'export const commands = [];\nexport async function onLoad() {}\nexport async function onReady() {}\n';

const inMemoryLock = {
  setNX: async (): Promise<boolean> => true,
  release: async (): Promise<void> => undefined,
};

function loggerStub(): Logger {
  const noop = (): void => undefined;
  const stub = {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    child(): Logger {
      return stub as unknown as Logger;
    },
  };
  return stub as unknown as Logger;
}

test('deploy path: verify → gate → sign → promote → the loader accepts the module', async () => {
  const root = mkdtempSync(join(tmpdir(), 'deployflow-'));
  const stagingVolume = join(root, 'staging');
  const liveVolume = join(root, TIER_VOLUME_NAMES.standard);
  mkdirSync(stagingVolume, { recursive: true });
  mkdirSync(liveVolume, { recursive: true });
  const stagingDir = join(stagingVolume, `${MANIFEST.name}__${MANIFEST.version}`);
  mkdirSync(stagingDir, { recursive: true });
  writeFileSync(join(stagingDir, 'manifest.json'), JSON.stringify(MANIFEST, null, 2), 'utf8');
  writeFileSync(join(stagingDir, 'index.js'), INDEX_SOURCE, 'utf8');
  // spec §30 — a module's locales are mandatory; Stage 11 fails without en-US.json.
  mkdirSync(join(stagingDir, 'locales'), { recursive: true });
  writeFileSync(join(stagingDir, 'locales', 'en-US.json'), '{}', 'utf8');

  // 1. Static verification of the staged build.
  const verification = verifyStagedBuild({
    stagingVolume,
    moduleSlug: MANIFEST.name,
    version: MANIFEST.version,
  });
  expect(verification.ok).toBe(true);
  if (!verification.ok) return;

  // 2. The promotion gate — a FIRST promotion is refused without human approval (ADR-006).
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: false })).toStrictEqual({
    allowed: false,
    reason: expect.any(String),
  });
  expect(decidePromotionGate({ isFirstPromotion: true, humanApproved: true })).toStrictEqual({
    allowed: true,
    gate: 'human',
  });

  // 3. Sign the provenance with an ephemeral key the loader's verifier will hold.
  const keypair = generateKeyPairSync('ed25519');
  const keyId = 'test-deploy-key';
  const privateKey = keypair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKey = keypair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const buildId = 'build_deployflow_1_0_0';
  const signed = signProvenance({
    stagingDir,
    moduleSlug: MANIFEST.name,
    version: MANIFEST.version,
    devId: MANIFEST.devId,
    buildId,
    keyId,
    privateKey,
  });

  // 4. Promote under lock, carrying the sidecar onto the live volume.
  const outcome = await promoteUnderLock({
    lockStore: inMemoryLock,
    liveVolume,
    stagingVolume,
    moduleSlug: MANIFEST.name,
    stagingDir,
    provenance: signed.sidecar,
  });
  expect(existsSync(outcome.liveLink)).toBe(true);
  const sidecar = readBuildProvenanceSidecar(realpathSync(outcome.liveLink));
  expect(sidecar).not.toBeNull();
  expect(sidecar?.buildId).toBe(buildId);

  // 5. The loader accepts the promoted module — its provenance is verified against the builds row
  //    and the armed signature verifier. This is the assertion the deploy path exists to earn.
  const buildStore = {
    findByBuildId: async (id: string) =>
      id === buildId
        ? {
            buildId,
            moduleSlug: MANIFEST.name,
            version: MANIFEST.version,
            devId: MANIFEST.devId,
            sourceArchiveHash: signed.sourceArchiveHash,
            artifactHash: signed.artifactHash,
            lockfileHash: signed.lockfileHash,
            gateResultsHash: signed.gateResultsHash,
            sbom: null,
            signature: signed.sidecar.signature,
            signatureKeyId: signed.sidecar.signatureKeyId,
            signedDescriptor: signed.sidecar.signedDescriptor,
            validationStatus: 'passed',
          }
        : undefined,
  };
  const verifier = new BuildSignatureVerifier().registerKey(keyId, publicKey);
  const result = await loadModulesFromTierVolumes({
    modulesDir: root,
    registry: new ModuleRegistry(),
    logger: loggerStub(),
    buildStore,
    verifier,
  });
  expect(result.failed).toStrictEqual([]);
  expect(result.loaded).toContain(MANIFEST.name);
});

test('deploy path: an unsigned module on a tier volume is refused by the loader', async () => {
  // The negative control: a module placed on a tier volume WITHOUT going through the deploy path
  // (no sidecar) is refused when a build store is supplied. This is the security property the
  // deploy path exists to satisfy — hand-copying is not a shortcut.
  const root = mkdtempSync(join(tmpdir(), 'deployflow-neg-'));
  const liveDir = join(root, TIER_VOLUME_NAMES.standard, 'unsigned');
  mkdirSync(liveDir, { recursive: true });
  writeFileSync(join(liveDir, 'manifest.json'), JSON.stringify(MANIFEST, null, 2), 'utf8');
  writeFileSync(join(liveDir, 'index.js'), INDEX_SOURCE, 'utf8');
  mkdirSync(join(liveDir, 'locales'), { recursive: true });
  writeFileSync(join(liveDir, 'locales', 'en-US.json'), '{}', 'utf8');

  await expect(
    loadModulesFromTierVolumes({
      modulesDir: root,
      registry: new ModuleRegistry(),
      logger: loggerStub(),
      buildStore: { findByBuildId: async () => undefined },
      verifier: new BuildSignatureVerifier(),
    }),
  ).rejects.toThrow(/discovery failed/);
});
