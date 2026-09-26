/**
 * Minimal semver comparison used by the Compatibility Ledger (blueprint §14.4).
 *
 * Contract versions are strict `MAJOR.MINOR.PATCH` (optionally `-prerelease` /
 * `+build`). Only the numeric core participates in comparison; pre-release and
 * build suffixes are recognized but do not change ordering (the ledger treats
 * them as metadata, matching the manifest schema's `^\d+\.\d+\.\d+$` floor).
 */

export const SEMVER_CORE_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;

export interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/**
 * An acceptance window over a contract version: `[minInclusive, maxExclusive)`
 * with an excluded list. The `versionWithinWindow` check is the ledger's core
 * primitive (blueprint §14.4).
 */
export interface ContractWindow {
  readonly minInclusive: string;
  readonly maxExclusive: string;
  readonly excluded: readonly string[];
}

export function parseSemver(version: string): ParsedSemver | null {
  const match = SEMVER_CORE_PATTERN.exec(version);
  if (match === null) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Returns -1 (a < b), 0 (a == b), or 1 (a > b). Malformed input sorts lowest. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? -1 : 1;
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return 0;
}

/**
 * True when `version` lies inside `[minInclusive, maxExclusive)` and is not on
 * the excluded list. Versions equal to the max boundary are rejected (window is
 * maximum-exclusive, per blueprint §14.4).
 */
export function versionWithinWindow(version: string, window: ContractWindow): boolean {
  if (window.excluded.includes(version)) return false;
  if (compareVersions(version, window.minInclusive) < 0) return false;
  if (compareVersions(version, window.maxExclusive) >= 0) return false;
  return true;
}
