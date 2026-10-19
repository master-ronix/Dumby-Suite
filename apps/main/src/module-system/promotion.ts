import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
  symlinkSync,
  unlinkSync,
  readlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { LockStore } from '../cache/redis-lock-store.js';
import { parseManifest, type ModuleManifest } from './manifest.schema.js';
import {
  assertPathInside,
  assertSafeSlug,
  assertSafeVersion,
  safeJoin,
} from '../shared/utils/path-guard.js';
import {
  BUILD_PROVENANCE_SIDECAR,
  writeBuildProvenanceSidecar,
  type BuildProvenanceSidecar,
} from './build-signing.js';

export const PROMOTION_LOCK_KEY_PREFIX = 'swastik:promote:';
export const PROMOTION_LOCK_TTL_MS = 15_000;

function indexLoadCheck(indexPath: string): string | null {
  const probe = join(tmpdir(), `swastik-probe-${randomBytes(8).toString('hex')}.mjs`);
  writeFileSync(probe, readFileSync(indexPath, 'utf8'), 'utf8');
  try {
    execFileSync(process.execPath, ['--check', probe], { stdio: 'pipe', timeout: 5_000 });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  } finally {
    try {
      unlinkSync(probe);
    } catch {}
  }
}

export interface StagedBuildVerification {
  readonly ok: boolean;
  readonly reason?: string;
  readonly stagingDir?: string;
  readonly manifest?: ModuleManifest;
}

export function verifyStagedBuild(input: {
  readonly stagingVolume: string;
  readonly moduleSlug: string;
  readonly version: string;
}): StagedBuildVerification {
  let slug: string;
  let version: string;
  try {
    slug = assertSafeSlug(input.moduleSlug);
    version = assertSafeVersion(input.version);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  let stagingDir: string;
  try {
    stagingDir = safeJoin(input.stagingVolume, `${slug}__${version}`);
    assertPathInside(input.stagingVolume, stagingDir);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
  if (!existsSync(stagingDir)) {
    return { ok: false, reason: `staged directory missing for ${slug}@${version}` };
  }
  const manifestPath = join(stagingDir, 'manifest.json');
  const indexPath = join(stagingDir, 'index.js');
  if (!existsSync(manifestPath)) {
    return { ok: false, reason: `manifest.json is missing from staged build ${slug}@${version}` };
  }
  if (!existsSync(indexPath)) {
    return { ok: false, reason: `index.js is missing from staged build ${slug}@${version}` };
  }
  const indexSource = readFileSync(indexPath, 'utf8');
  if (indexSource.trim().length === 0) {
    return { ok: false, reason: `index.js is empty for staged build ${slug}@${version}` };
  }
  let manifest: ModuleManifest;
  try {
    manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
  } catch (err) {
    return {
      ok: false,
      reason: `manifest validation failed for ${slug}@${version}: ${(err as Error).message}`,
    };
  }
  if (manifest.name !== slug) {
    return {
      ok: false,
      reason: `manifest name "${manifest.name}" does not match module "${slug}"`,
    };
  }
  if (manifest.version !== version) {
    return {
      ok: false,
      reason: `manifest version "${manifest.version}" does not match staged version "${version}"`,
    };
  }
  const syntaxError = indexLoadCheck(indexPath);
  if (syntaxError !== null) {
    return {
      ok: false,
      reason: `index.js failed static load verification for ${slug}@${version}: ${syntaxError}`,
    };
  }
  return { ok: true, stagingDir, manifest };
}

export type PromotionGateDecision =
  | { readonly allowed: true; readonly gate: 'human' | 'diff' }
  | { readonly allowed: false; readonly reason: string };

export function decidePromotionGate(input: {
  readonly isFirstPromotion: boolean;
  readonly humanApproved: boolean;
}): PromotionGateDecision {
  if (input.isFirstPromotion) {
    if (!input.humanApproved) {
      return {
        allowed: false,
        reason: 'first promotion of this module requires human approval (ADR-006)',
      };
    }
    return { allowed: true, gate: 'human' };
  }
  return { allowed: true, gate: 'diff' };
}

export interface PromotionOutcome {
  readonly liveLink: string;
  readonly previousTarget: string | null;
  readonly rollbackLink: string | null;
}

export function promoteAtomically(input: {
  readonly liveVolume: string;
  readonly stagingVolume: string;
  readonly moduleSlug: string;
  readonly stagingDir: string;
  /**
   * §15.8 provenance sidecar. When supplied it is written into the staged directory immediately
   * before the pointer flip, so the promoted directory carries the buildId and signature the
   * loader's load-time verification reads (finding #22). The atomic-swap mechanics are unchanged.
   */
  readonly provenance?: BuildProvenanceSidecar;
  /**
   * UR-20261018-093 / Option B — the BAKED slugs (from the image manifest `BAKED_MODULES_MANIFEST`),
   * lower-cased. Under Option B the volume holds seeded baked copies AND promoted modules, so a bare
   * directory check cannot tell them apart; the manifest is the authoritative list of baked slugs.
   */
  readonly reservedSlugs?: readonly string[];
}): PromotionOutcome {
  const slug = assertSafeSlug(input.moduleSlug);
  assertPathInside(input.stagingVolume, input.stagingDir);
  if (!existsSync(input.stagingDir)) {
    throw new Error(`staged directory missing for ${slug} — refusing promotion`);
  }
  const liveLink = safeJoin(input.liveVolume, slug);
  assertPathInside(input.liveVolume, liveLink);
  const incomingLink = safeJoin(input.liveVolume, `${slug}__incoming`);
  assertPathInside(input.liveVolume, incomingLink);
  const rollbackLink = safeJoin(input.liveVolume, `${slug}__rollback`);
  // UR-20261018-093 / Option B — a BAKED slug is RESERVED. A promoted `<slug>__<version>` beside a
  // baked `<slug>` gives the loader two modules with one manifest name, which aborts the boot and —
  // on a persistent volume — would abort every restart. Reject it here, at promotion, not at load.
  // The authoritative list is the image manifest (`reservedSlugs`); case is normalised so a
  // `Hello-World` promotion cannot slip past a baked `hello-world`.
  // The DIRECTORY slug can be spoofed: a promoted module may use a NEW slug but declare the manifest
  // `name` of a baked module (the loader collides on the name, not the directory). So check the
  // DECLARED name too, case-insensitively.
  let declaredName = slug;
  try {
    const staged = JSON.parse(readFileSync(join(input.stagingDir, 'manifest.json'), 'utf8')) as { name?: string };
    if (typeof staged.name === 'string' && staged.name !== '') declaredName = staged.name;
  } catch {
    // staged manifest unreadable — the slug check below still applies.
  }
  const reserved = (input.reservedSlugs ?? []).some(
    (s) => s.toLowerCase() === slug.toLowerCase() || s.toLowerCase() === declaredName.toLowerCase(),
  );
  const bakedDir = existsSync(liveLink) && !lstatIsLink(liveLink);
  if (reserved || bakedDir) {
    throw new Error(`reserved slug "${slug}" (name "${declaredName}"): a baked module owns it — promotion refused (Option B)`);
  }

  let previousTarget: string | null = null;
  if (lstatIsLink(liveLink)) {
    try {
      previousTarget = readlinkSync(liveLink);
      assertPathInside(input.stagingVolume, previousTarget);
    } catch (err) {
      throw new Error(
        `live link for "${slug}" exists but is not a staging-contained symlink — refusing promotion: ${(err as Error).message}`,
      );
    }
  } else if (existsSync(liveLink)) {
    throw new Error(
      `live entry for "${slug}" is a real file or directory, not a staging-contained symlink — refusing promotion`,
    );
  }

  let sidecarWritten = false;
  if (input.provenance !== undefined) {
    writeBuildProvenanceSidecar(input.stagingDir, input.provenance);
    sidecarWritten = true;
  }

  try {
    if (lstatIsLink(incomingLink)) unlinkSync(incomingLink);
    symlinkSync(input.stagingDir, incomingLink);
    if (previousTarget !== null) {
      if (lstatIsLink(rollbackLink)) unlinkSync(rollbackLink);
      symlinkSync(previousTarget, rollbackLink);
    }
    renameSync(incomingLink, liveLink);
    assertPostFlipContainment(liveLink, input.stagingVolume, input.stagingDir, slug);
  } catch (err) {
    try {
      if (lstatIsLink(incomingLink)) unlinkSync(incomingLink);
    } catch {}
    if (sidecarWritten) {
      try {
        unlinkSync(join(input.stagingDir, BUILD_PROVENANCE_SIDECAR));
      } catch {}
    }
    throw err;
  }

  return {
    liveLink,
    previousTarget,
    rollbackLink: previousTarget !== null ? rollbackLink : null,
  };
}

export class PromotionLockedError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(
      `promotion for "${slug}" refused: lock "${PROMOTION_LOCK_KEY_PREFIX}${slug}" is held (a promotion/restart may be in flight)`,
    );
    this.name = 'PromotionLockedError';
    this.slug = slug;
  }
}

export async function promoteUnderLock(input: {
  readonly lockStore: LockStore;
  readonly liveVolume: string;
  readonly stagingVolume: string;
  readonly moduleSlug: string;
  readonly stagingDir: string;
  readonly lockTtlMs?: number;
  readonly provenance?: BuildProvenanceSidecar;
  /** UR-20261018-093 / Option B — baked slugs (from the image manifest) that promotion must refuse. */
  readonly reservedSlugs?: readonly string[];
}): Promise<PromotionOutcome> {
  const slug = assertSafeSlug(input.moduleSlug);
  const lockKey = `${PROMOTION_LOCK_KEY_PREFIX}${slug}`;
  const lockOwner = randomBytes(16).toString('hex');
  const lockTtlMs = input.lockTtlMs ?? PROMOTION_LOCK_TTL_MS;
  const acquired = await input.lockStore.setNX(lockKey, lockOwner, lockTtlMs);
  if (!acquired) throw new PromotionLockedError(slug);
  try {
    return promoteAtomically({
      liveVolume: input.liveVolume,
      stagingVolume: input.stagingVolume,
      moduleSlug: slug,
      stagingDir: input.stagingDir,
      ...(input.provenance !== undefined ? { provenance: input.provenance } : {}),
      ...(input.reservedSlugs !== undefined ? { reservedSlugs: input.reservedSlugs } : {}),
    });
  } finally {
    await input.lockStore.release(lockKey, lockOwner);
  }
}

function assertPostFlipContainment(
  liveLink: string,
  stagingVolume: string,
  stagingDir: string,
  slug: string,
): void {
  if (!lstatIsLink(liveLink)) {
    throw new Error(
      `post-flip containment failed for "${slug}": live link "${liveLink}" is not a symlink after promotion`,
    );
  }
  let target: string;
  try {
    target = readlinkSync(liveLink);
  } catch (err) {
    throw new Error(
      `post-flip containment failed for "${slug}": cannot read live link — ${(err as Error).message}`,
    );
  }
  try {
    assertPathInside(stagingVolume, target);
  } catch (err) {
    throw new Error(
      `post-flip containment failed for "${slug}": live link resolves outside staging to "${target}" — ${(err as Error).message}`,
    );
  }
  if (resolve(target) !== resolve(stagingDir)) {
    throw new Error(
      `post-flip containment failed for "${slug}": live link resolves to "${target}", expected promoted build "${stagingDir}"`,
    );
  }
}

function lstatIsLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

export function rollbackPromotion(outcome: PromotionOutcome): void {
  if (lstatIsLink(outcome.liveLink) || existsSync(outcome.liveLink)) {
    unlinkSync(outcome.liveLink);
  }
  if (outcome.previousTarget !== null) {
    symlinkSync(outcome.previousTarget, outcome.liveLink);
  }
}
