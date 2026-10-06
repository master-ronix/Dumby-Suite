import { isAbsolute, resolve, sep } from 'node:path';

export interface PathGuardError extends Error {
  kind: 'TRAVERSAL' | 'UNSAFE_ABSOLUTE' | 'EMPTY_SEGMENT' | 'UNSAFE_VERSION';
}

function fail(kind: PathGuardError['kind'], message: string): never {
  const err = new Error(message) as PathGuardError;
  err.name = 'PathGuardError';
  err.kind = kind;
  throw err;
}

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

export function assertPathInside(root: string, candidate: string): void {
  const rootResolved = resolve(root);
  const candResolved = resolve(candidate);
  if (candResolved !== rootResolved && !candResolved.startsWith(rootResolved + sep)) {
    fail('TRAVERSAL', `path "${candidate}" escapes root "${root}"`);
  }
}

export function assertSafeSlug(slug: string): string {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(slug)) {
    fail('TRAVERSAL', `module slug must be lowercase kebab-case, got "${slug}"`);
  }
  return slug;
}

export function assertSafeVersion(version: string): string {
  if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(version)) {
    fail('UNSAFE_VERSION', `module version must be semver-like, got "${version}"`);
  }
  return version;
}
