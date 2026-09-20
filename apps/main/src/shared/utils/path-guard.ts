import { isAbsolute, resolve, sep } from 'node:path';

/**
 * Filesystem path containment guards (CL-0151, CL-0070).
 *
 * The Swastik staging/live/rollback volumes are the only places build
 * artifacts may be written and promoted, and every path under them is derived
 * from developer-controlled strings (`moduleSlug`, `version`, `buildId`).
 * These two helpers are the single choke point that keeps those writes inside
 * the volume that owns them; nothing else may turn untrusted input into a
 * filesystem path.
 */

export interface PathGuardError extends Error {
  kind: 'TRAVERSAL' | 'UNSAFE_ABSOLUTE' | 'EMPTY_SEGMENT';
}

function fail(kind: PathGuardError['kind'], message: string): never {
  const err = new Error(message) as PathGuardError;
  err.name = 'PathGuardError';
  err.kind = kind;
  throw err;
}

/**
 * Joins `root` with `segment` and returns the normalized absolute path,
 * asserting the result never escapes `root`. Rejects absolute segments,
 * empty segments, and any `..`/`.`, plus any NUL byte (Node throws on NUL
 * in paths anyway; we fail fast for a clean 422 instead).
 */
export function safeJoin(root: string, segment: string): string {
  if (segment.length === 0) fail('EMPTY_SEGMENT', 'path segment must not be empty');
  if (segment.includes('\0')) fail('TRAVERSAL', 'path segment must not contain a NUL byte');
  if (isAbsolute(segment)) fail('UNSAFE_ABSOLUTE', 'path segment must be relative');
  const rootResolved = resolve(root);
  const candidate = resolve(rootResolved, segment);
  if (candidate !== rootResolved && !candidate.startsWith(rootResolved + sep)) {
    fail('TRAVERSAL', `path escapes root "${root}"`);
  }
  return candidate;
}

/**
 * Throws unless the already-resolved `candidate` sits inside `root`
 * (equal to root or strictly under it). Use this when a path has already been
 * computed by other means and merely needs re-verifying before a write.
 */
export function assertPathInside(root: string, candidate: string): void {
  const rootResolved = resolve(root);
  const candResolved = resolve(candidate);
  if (candResolved !== rootResolved && !candResolved.startsWith(rootResolved + sep)) {
    fail('TRAVERSAL', `path "${candidate}" escapes root "${root}"`);
  }
}

/** Guard contra path traversal in a module slug derived from the request. */
export function assertSafeSlug(slug: string): string {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(slug)) {
    fail('TRAVERSAL', `module slug must be lowercase kebab-case, got "${slug}"`);
  }
  return slug;
}
