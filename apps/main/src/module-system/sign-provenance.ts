import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BuildSigner,
  hashBytes,
  hashFile,
  normalizeSigningKey,
  type BuildProvenanceSidecar,
  type BuildProvenanceTuple,
} from './build-signing.js';

/**
 * UR-20261019-103 — build the SIGNED provenance for a promoted module. The tuple binds the exact
 * deployed artifact bytes to the build identity (`devId`, `buildId`); the sidecar is written into the
 * module directory and the same fields complete the `builds` row, so the loader verifies the signature
 * (L2) on top of the hash floor (L1). Mandatory: a build with no key configured cannot be signed, so
 * the promotion is refused by the caller rather than promoting an unverifiable module.
 */
export interface SignedProvenance {
  readonly sidecar: BuildProvenanceSidecar;
  readonly artifactHash: string;
  readonly sourceArchiveHash: string;
  readonly gateResultsHash: string;
  readonly lockfileHash: string;
}

export function signProvenance(input: {
  readonly stagingDir: string;
  readonly moduleSlug: string;
  readonly version: string;
  readonly devId: string;
  readonly buildId: string;
  readonly keyId: string;
  readonly privateKey: string;
}): SignedProvenance {
  const indexPath = join(input.stagingDir, 'index.js');
  const artifactHash = hashFile(indexPath);
  const sourceArchiveHash = hashBytes(readFileSync(indexPath));
  let gateResultsHash: string;
  try {
    gateResultsHash = hashBytes(readFileSync(join(input.stagingDir, 'manifest.json')));
  } catch {
    gateResultsHash = hashBytes('');
  }
  const lockfileHash = hashBytes('');
  const tuple: BuildProvenanceTuple = {
    moduleSlug: input.moduleSlug,
    version: input.version,
    devId: input.devId,
    buildId: input.buildId,
    sourceArchiveHash,
    artifactHash,
    gateResultsHash,
  };
  const signer = BuildSigner.fromPkcs8Pem(input.keyId, normalizeSigningKey(input.privateKey));
  const sidecar = signer.signSidecar(tuple, lockfileHash);
  return { sidecar, artifactHash, sourceArchiveHash, gateResultsHash, lockfileHash };
}
