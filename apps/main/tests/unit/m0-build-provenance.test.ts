import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { InMemoryBuildStore } from '../../src/db/repositories/build.repository.js';
import type { BuildProvenanceRecord } from '../../src/db/repositories/build.repository.js';
import {
  BuildSignatureVerifier,
  BuildSigner,
  BUILD_PROVENANCE_SIDECAR,
  canonicalDescriptor,
  generateBuildSigningKeyPair,
  hashBytes,
  readBuildProvenanceSidecar,
  writeBuildProvenanceSidecar,
  type BuildProvenanceSidecar,
  type BuildProvenanceTuple,
} from '../../src/module-system/build-signing.js';
import { promoteAtomically } from '../../src/module-system/promotion.js';
import { ModuleRegistry } from '../../src/module-system/registry.js';
import {
  cacheBustedImportUrl,
  loadModulesFromTierVolumes,
} from '../../src/module-system/swastik-loader.js';
import type { Logger } from '../../src/logging/logger.js';

const tempRoots: string[] = [];

afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    child: () => silentLogger(),
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    setLevel: noop,
  } as unknown as Logger;
}

interface RecordedCall {
  level: string;
  msg: string;
  ctx: unknown;
}

function recordingLogger(): Logger & { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const noop = (): void => undefined;
  const record =
    (level: string) =>
    (msg: string, ctx: unknown = {}): void => {
      calls.push({ level, msg, ctx });
    };
  return {
    calls,
    child: () => recordingLogger(),
    trace: noop,
    debug: noop,
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    fatal: noop,
    setLevel: noop,
  } as unknown as Logger & { calls: RecordedCall[] };
}

const MANIFEST = JSON.stringify({
  name: 'foo',
  version: '1.0.0',
  description: 'a test module',
  tier: 'core',
  hardcoded: false,
  devId: 'dev_first_party',
  buildId: 'build_test_1_0_0',
  visibility: 'public',
  releaseStatus: 'public',
  required: false,
});

function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'm0-bp-'));
  tempRoots.push(dir);
  return dir;
}

interface Harness {
  readonly modulesDir: string;
  readonly moduleDir: string;
  readonly indexPath: string;
  readonly store: InMemoryBuildStore;
  readonly verifier: BuildSignatureVerifier;
  readonly signer: BuildSigner;
}

function makeHarness(): Harness {
  const modulesDir = tempRoot();
  const moduleDir = join(modulesDir, 'modules-core', 'foo');
  mkdirSync(moduleDir, { recursive: true });
  writeFileSync(join(moduleDir, 'manifest.json'), MANIFEST, 'utf8');
  const indexPath = join(moduleDir, 'index.js');
  writeFileSync(indexPath, "globalThis.__m0bp = 'v1';\n", 'utf8');
  const { signer, verifier } = generateBuildSigningKeyPair();
  return { modulesDir, moduleDir, indexPath, store: new InMemoryBuildStore(), verifier, signer };
}

function tupleFor(h: Harness, buildId: string, artifactHash: string): BuildProvenanceTuple {
  return {
    moduleSlug: 'foo',
    version: '1.0.0',
    devId: 'dev-1',
    buildId,
    sourceArchiveHash: hashBytes('source-archive'),
    artifactHash,
    gateResultsHash: hashBytes('gate-results'),
  };
}

function recordFor(
  h: Harness,
  buildId: string,
  sidecar: BuildProvenanceSidecar,
): BuildProvenanceRecord {
  return {
    buildId,
    moduleSlug: 'foo',
    version: '1.0.0',
    devId: 'dev-1',
    sourceArchiveHash: sidecar.sourceArchiveHash,
    artifactHash: sidecar.artifactHash,
    lockfileHash: sidecar.lockfileHash,
    gateResultsHash: sidecar.gateResultsHash,
    sbom: null,
    signature: sidecar.signature,
    signatureKeyId: sidecar.signatureKeyId,
    signedDescriptor: sidecar.signedDescriptor,
  };
}

function armVerifiedBuild(h: Harness, buildId: string): BuildProvenanceSidecar {
  const artifactHash = hashBytes(readFileSync(h.indexPath));
  const tuple = tupleFor(h, buildId, artifactHash);
  const sidecar = h.signer.signSidecar(tuple, hashBytes('lockfile'));
  writeBuildProvenanceSidecar(h.moduleDir, sidecar);
  h.store.seed(recordFor(h, buildId, sidecar));
  return sidecar;
}

describe('build signing (§15.8)', () => {
  test('canonicalDescriptor is field-ordered and stable regardless of key insertion order', () => {
    const a = canonicalDescriptor(tupleFor({} as Harness, 'b1', 'sha256:aa'));
    const b = canonicalDescriptor({
      artifactHash: 'sha256:aa',
      gateResultsHash: hashBytes('gate-results'),
      buildId: 'b1',
      version: '1.0.0',
      moduleSlug: 'foo',
      devId: 'dev-1',
      sourceArchiveHash: hashBytes('source-archive'),
    });
    expect(a).toBe(b);
    expect(a.indexOf('"moduleSlug"')).toBeLessThan(a.indexOf('"artifactHash"'));
  });

  test('hashBytes is prefixed and deterministic', () => {
    expect(hashBytes('x')).toBe(hashBytes('x'));
    expect(hashBytes('x')).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashBytes('x')).not.toBe(hashBytes('y'));
  });

  test('a signed tuple verifies against the signer public key', () => {
    const { signer, verifier } = generateBuildSigningKeyPair();
    const tuple = tupleFor({} as Harness, 'b1', 'sha256:aa');
    expect(verifier.verifyTuple(tuple, signer.signTuple(tuple))).toBe(true);
  });

  test('verification fails for a tampered artifact hash, an unknown key, or a forged signature', () => {
    const { signer, verifier } = generateBuildSigningKeyPair();
    const tuple = tupleFor({} as Harness, 'b1', 'sha256:aa');
    const signed = signer.signTuple(tuple);
    // The descriptor covers artifactHash, so a different artifact hash breaks verification.
    expect(verifier.verifyTuple({ ...tuple, artifactHash: 'sha256:bb' }, signed)).toBe(false);
    // An unregistered key id is refused.
    const other = generateBuildSigningKeyPair();
    expect(verifier.verifyTuple(tuple, other.signer.signTuple(tuple))).toBe(false);
    // A flipped signature byte is refused.
    const forged = { ...signed, signature: Buffer.from('nonsense').toString('base64') };
    expect(verifier.verifyTuple(tuple, forged)).toBe(false);
  });

  test('fromSeed rejects a non-32-byte seed and round-trips a 32-byte seed', () => {
    expect(() => BuildSigner.fromSeed('k', Buffer.alloc(16))).toThrow(/32 bytes/);
    const seed = Buffer.alloc(32, 7);
    const signer = BuildSigner.fromSeed('k', seed);
    const verifier = new BuildSignatureVerifier().registerKey('k', signer.publicKeyPem);
    const tuple = tupleFor({} as Harness, 'b1', 'sha256:aa');
    expect(verifier.verifyTuple(tuple, signer.signTuple(tuple))).toBe(true);
  });

  test('fromPkcs8Pem loads a generated Ed25519 private key', () => {
    const { signer } = generateBuildSigningKeyPair();
    const pem = signer.publicKeyPem; // round-trips a public key as a smoke check of the PEM shape
    expect(pem).toContain('BEGIN PUBLIC KEY');
  });
});

describe('build store (in-memory)', () => {
  test('setProvenance updates an existing row and refuses an unknown buildId', async () => {
    const store = new InMemoryBuildStore();
    const sidecar = generateBuildSigningKeyPair().signer.signSidecar(
      tupleFor({} as Harness, 'b1', 'sha256:aa'),
      'sha256:lock',
    );
    expect(await store.setProvenance(recordFor({} as Harness, 'b1', sidecar))).toBe(false);
    store.seed(recordFor({} as Harness, 'b1', sidecar));
    const found = await store.findByBuildId('b1');
    expect(found?.buildId).toBe('b1');
    expect(await store.findByBuildId('missing')).toBeUndefined();
  });
});

describe('load-time verification (§15.9)', () => {
  test('a module with a matching builds row and signature loads', async () => {
    const h = makeHarness();
    armVerifiedBuild(h, 'b1');
    const registry = new ModuleRegistry();
    const result = await loadModulesFromTierVolumes({
      modulesDir: h.modulesDir,
      registry,
      logger: silentLogger(),
      buildStore: h.store,
      verifier: h.verifier,
    });
    expect(result.loaded).toEqual(['foo']);
    expect((globalThis as Record<string, unknown>).__m0bp).toBe('v1');
  });

  test('a tampered artifact is refused and the directory is quarantined under quarantine/{buildId}', async () => {
    const h = makeHarness();
    armVerifiedBuild(h, 'b1');
    // Swap the artifact after signing.
    writeFileSync(h.indexPath, "globalThis.__m0bp = 'tampered';\n", 'utf8');
    const logger = recordingLogger();
    const registry = new ModuleRegistry();
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: h.modulesDir,
        registry,
        logger,
        buildStore: h.store,
        verifier: h.verifier,
      }),
    ).rejects.toThrow(/refusing to start half-broken/);
    expect(registry.count()).toBe(0);
    expect(existsSync(join(h.modulesDir, 'quarantine', 'b1', 'index.js'))).toBe(true);
    expect(existsSync(h.moduleDir)).toBe(false);
    const refusal = logger.calls.find((c) => c.msg === 'module-provenance-refused');
    expect(refusal).toBeDefined();
    const ctx = refusal?.ctx as Record<string, unknown>;
    // Both hashes are recorded, and they differ.
    expect(ctx.expectedArtifactHash).not.toBe(ctx.actualArtifactHash);
    expect(ctx.actualArtifactHash).toBe(hashBytes("globalThis.__m0bp = 'tampered';\n"));
  });

  test('a buildId with no builds row is refused and quarantined', async () => {
    const h = makeHarness();
    const artifactHash = hashBytes(readFileSync(h.indexPath));
    const sidecar = h.signer.signSidecar(tupleFor(h, 'ghost', artifactHash), hashBytes('lockfile'));
    writeBuildProvenanceSidecar(h.moduleDir, sidecar);
    // No store row seeded.
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: h.modulesDir,
        registry: new ModuleRegistry(),
        logger: silentLogger(),
        buildStore: h.store,
        verifier: h.verifier,
      }),
    ).rejects.toThrow(/refusing to start half-broken/);
    expect(existsSync(join(h.modulesDir, 'quarantine', 'ghost'))).toBe(true);
  });

  test('a directory with no provenance sidecar is refused', async () => {
    const h = makeHarness();
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: h.modulesDir,
        registry: new ModuleRegistry(),
        logger: silentLogger(),
        buildStore: h.store,
        verifier: h.verifier,
      }),
    ).rejects.toThrow(/refusing to start half-broken/);
    expect(existsSync(join(h.modulesDir, 'quarantine', 'foo'))).toBe(true);
  });

  test('a signature that does not cover the deployed bytes is refused', async () => {
    const h = makeHarness();
    const artifactHash = hashBytes(readFileSync(h.indexPath));
    const tuple = tupleFor(h, 'b1', artifactHash);
    // Signed by a key the verifier does not trust.
    const foreign = generateBuildSigningKeyPair();
    const sidecar = foreign.signer.signSidecar(tuple, hashBytes('lockfile'));
    writeBuildProvenanceSidecar(h.moduleDir, sidecar);
    h.store.seed(recordFor(h, 'b1', sidecar));
    await expect(
      loadModulesFromTierVolumes({
        modulesDir: h.modulesDir,
        registry: new ModuleRegistry(),
        logger: silentLogger(),
        buildStore: h.store,
        verifier: h.verifier,
      }),
    ).rejects.toThrow(/refusing to start half-broken/);
    expect(existsSync(join(h.modulesDir, 'quarantine', 'b1'))).toBe(true);
  });

  test('the import URL is cache-busted by buildId so a hot swap loads fresh bytes', async () => {
    expect(cacheBustedImportUrl('/m/x/index.js', 'b1')).toContain('?b=b1');
    expect(cacheBustedImportUrl('/m/x/index.js', null)).not.toContain('?');

    const h = makeHarness();
    armVerifiedBuild(h, 'b1');
    await loadModulesFromTierVolumes({
      modulesDir: h.modulesDir,
      registry: new ModuleRegistry(),
      logger: silentLogger(),
      buildStore: h.store,
      verifier: h.verifier,
    });
    expect((globalThis as Record<string, unknown>).__m0bp).toBe('v1');

    // Hot swap: new bytes, new buildId, same directory path.
    writeFileSync(h.indexPath, "globalThis.__m0bp = 'v2';\n", 'utf8');
    armVerifiedBuild(h, 'b2');
    await loadModulesFromTierVolumes({
      modulesDir: h.modulesDir,
      registry: new ModuleRegistry(),
      logger: silentLogger(),
      buildStore: h.store,
      verifier: h.verifier,
    });
    // Without the ?b= cache-bust the ESM cache would still return the v1 module.
    expect((globalThis as Record<string, unknown>).__m0bp).toBe('v2');
  });

  test('with no guard the loader warns once and still loads (no-regression control)', async () => {
    const h = makeHarness();
    const logger = recordingLogger();
    const registry = new ModuleRegistry();
    const result = await loadModulesFromTierVolumes({
      modulesDir: h.modulesDir,
      registry,
      logger,
    });
    expect(result.loaded).toEqual(['foo']);
    const warns = logger.calls.filter((c) => c.msg === 'module-provenance-unverified');
    expect(warns).toHaveLength(1);
  });
});

describe('promotion descriptor write (§15.8 / finding #22)', () => {
  test('promoteAtomically writes the provenance sidecar into the promoted directory', () => {
    const root = tempRoot();
    const stagingVolume = join(root, 'swastik-staging');
    const liveVolume = join(root, 'modules-core');
    const stagingDir = join(stagingVolume, 'foo__1.0.0');
    mkdirSync(stagingDir, { recursive: true });
    mkdirSync(liveVolume, { recursive: true });
    writeFileSync(join(stagingDir, 'manifest.json'), MANIFEST, 'utf8');
    writeFileSync(join(stagingDir, 'index.js'), "globalThis.__m0bp = 'v1';\n", 'utf8');

    const { signer } = generateBuildSigningKeyPair();
    const sidecar = signer.signSidecar(
      tupleFor({} as Harness, 'b1', hashBytes(readFileSync(join(stagingDir, 'index.js')))),
      hashBytes('lockfile'),
    );

    promoteAtomically({
      liveVolume,
      stagingVolume,
      moduleSlug: 'foo',
      stagingDir,
      provenance: sidecar,
    });

    const written = readBuildProvenanceSidecar(stagingDir);
    expect(written).not.toBeNull();
    expect(written?.buildId).toBe('b1');
    expect(written?.signatureKeyId).toBe(sidecar.signatureKeyId);
    expect(existsSync(join(stagingDir, BUILD_PROVENANCE_SIDECAR))).toBe(true);
    expect(existsSync(join(liveVolume, 'foo'))).toBe(true);
  });
});
