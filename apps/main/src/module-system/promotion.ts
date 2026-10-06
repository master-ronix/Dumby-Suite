/**
 * Swastik promotion pipeline (blueprint §12.21, §15; ADR-006).
 *
 * Three invariants, enforced by construction:
 *
 *  - **Verified loads** — a staged build must pass static verification
 *    (path containment, manifest extraction via `parseManifest`, index syntax
 *    compile) before any live volume is touched; a build that fails
 *    verification never goes live.
 *  - **Atomic promotion** — the live symlink is replaced by a single
 *    `rename(2)` of a fully-built incoming link. A failure before the rename
 *    leaves the volume untouched; a failure after it is rolled back to the
 *    recorded previous target.
 *  - **ADR-006 gate** — the first promotion of a module is human-gated;
 *    subsequent updates are diff-auto-approved. No promotion path bypasses
 *    this decision (`decidePromotionGate` is the single decision point).
 *
 * Manifest reading is static extraction (D-4.9): `manifest.json` is parsed as
 * JSON and validated — never read via `import()`.
 */

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

/**
 * Distributed-lock contract for atomic promotion (blueprint §15.8, DIAGRAM
 * 15-B): the swap is executed under a Redis lock on
 * `swastik:promote:{moduleSlug}` so a promotion never interleaves with a core
 * restart (or another promotion of the same module). The LockStore interface
 * is the narrow save-side dependency; RedisLockStore (SET NX PX) is the
 * production implementation, InMemoryLockStore the test/fallback.
 */
export const PROMOTION_LOCK_KEY_PREFIX = 'swastik:promote:';
export const PROMOTION_LOCK_TTL_MS = 15_000;

/**
 * Static load verification of the module bundle that never executes it:
 * `node --check` parses the copy as ESM (.mjs) and reports syntax errors only.
 * `import()` is reserved for the bootstrap loader (D-4.9 keeps manifest
 * reading static; this keeps verified-load checking static too).
 */
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
    } catch {
      /* temp probe cleanup is best-effort */
    }
  }
}

export interface StagedBuildVerification {
  readonly ok: boolean;
  readonly reason?: string;
  readonly stagingDir?: string;
  readonly manifest?: ModuleManifest;
}

/**
 * Static verification of a staged build. Returns `ok: false` (with a reason)
 * instead of throwing so callers can map refusals onto HTTP/audit outcomes.
 */
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

/**
 * ADR-006's automation boundary as a pure function: the first promotion of a
 * module requires human approval; updates proceed on the diff-validation
 * basis (the staging-time license/ledger/validation gates already ran).
 */
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

/**
 * Atomically points `liveVolume/<slug>` at `stagingDir`.
 *
 * The incoming link is fully built under a `__incoming` name and then
 * `rename(2)`d onto the live name — POSIX replaces the destination atomically,
 * so a failed promotion leaves the previous live target in place. The previous
 * target (if any, and only if it is staging-contained) is preserved as a
 * `__rollback` link for post-swap recovery. This low-level primitive is
 * synchronous and lock-free; the Redis lock lives in {@link promoteUnderLock}.
 *
 * Post-flip containment (blueprint §15.8 / UR-C-14): immediately after the
 * `renameSync`, the live link is verified with `lstatSync`/`readlinkSync` —
 * it must still be a symlink resolving to exactly the promoted staging
 * directory inside the staging volume, never a real directory or any path
 * outside staging. `lstatSync` (not `readlinkSync`/`existsSync`) classifies
 * dangling `__rollback`/`__incoming` links as symlinks, so a link whose target
 * was cleaned up is still recognized and removed/restored correctly.
 */
export function promoteAtomically(input: {
  readonly liveVolume: string;
  readonly stagingVolume: string;
  readonly moduleSlug: string;
  readonly stagingDir: string;
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
    } catch {
      /* cleanup is best-effort; the volume was not swapped if rename never ran */
    }
    throw err;
  }

  return {
    liveLink,
    previousTarget,
    rollbackLink: previousTarget !== null ? rollbackLink : null,
  };
}

/**
 * Thrown (as a rejected promise) when another promotion/restart already holds
 * the module's `swastik:promote:{slug}` lock. The volume is never touched
 * while the lock is contended.
 */
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

/**
 * Redis-locked promotion (blueprint §15.8, DIAGRAM 15-B): executes
 * {@link promoteAtomically} under `SET NX PX` on `swastik:promote:{slug}` so a
 * promotion never interleaves with a core restart or another promotion of the
 * same module. The lock is released in a `finally`; a contended lock rejects
 * with {@link PromotionLockedError} — fail closed, volume untouched.
 */
export async function promoteUnderLock(input: {
  readonly lockStore: LockStore;
  readonly liveVolume: string;
  readonly stagingVolume: string;
  readonly moduleSlug: string;
  readonly stagingDir: string;
  readonly lockTtlMs?: number;
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
    });
  } finally {
    await input.lockStore.release(lockKey, lockOwner);
  }
}

/**
 * Post-flip containment assertion (blueprint §15.8 / UR-C-14): after the
 * `renameSync`, the live link must still be a symlink resolving to exactly the
 * promoted staging directory — never to a path outside the staging volume or
 * to a real directory. Throws on any violation.
 */
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

/** True only when `path` is a symbolic link, including a dangling one. */
function lstatIsLink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Restores the live link to its pre-promotion target (post-swap failure). */
export function rollbackPromotion(outcome: PromotionOutcome): void {
  if (lstatIsLink(outcome.liveLink) || existsSync(outcome.liveLink)) {
    unlinkSync(outcome.liveLink);
  }
  if (outcome.previousTarget !== null) {
    symlinkSync(outcome.previousTarget, outcome.liveLink);
  }
}
