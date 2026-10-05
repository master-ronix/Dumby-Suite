export const SEMVER_CORE_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;

export interface ParsedSemver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

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

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? -1 : 1;
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return 0;
}

export function versionWithinWindow(version: string, window: ContractWindow): boolean {
  if (window.excluded.includes(version)) return false;
  if (compareVersions(version, window.minInclusive) < 0) return false;
  if (compareVersions(version, window.maxExclusive) >= 0) return false;
  return true;
}

/**
 * Range satisfaction — Stage 11 (`topo-sort.ts`) pins every `depends` entry as `{ token, version }`
 * with `version` a semver range, and a token whose version does not satisfy the range is a fatal
 * error naming the token, the range, and the version found.
 *
 * Supported forms: exact (`1.2.3`), caret (`^1.2.3`), tilde (`~1.2.3`), comparators (`>=1.2.3`,
 * `>1.2.3`, `<=1.2.3`, `<1.2.3`, `=1.2.3`), wildcards (`*`, `1.x`, `1.2.x`), and `||` alternation.
 * A hyphen range (`1.2.3 - 2.0.0`) and the full grammar beyond this are deliberately not claimed.
 */
function wildcardBounds(
  part: string,
): { major: number | null; minor: number | null; wildcard: boolean } | null {
  const m = /^(\d+|x|\*)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?$/.exec(part.trim());
  if (m === null) return null;
  const wildcard = [m[1], m[2], m[3]].some((p) => p === 'x' || p === '*');
  const num = (s: string | undefined): number | null =>
    s === undefined || s === 'x' || s === '*' ? null : Number(s);
  return { major: num(m[1]), minor: num(m[2]), wildcard };
}

function satisfiesComparator(comparator: string, version: string): boolean {
  const trimmed = comparator.trim();
  if (trimmed === '' || trimmed === '*' || trimmed === 'x') return true;

  const op = /^(>=|<=|>|<|=|\^|~)?/.exec(trimmed)?.[1] ?? '';
  const rest = trimmed.slice(op.length);

  const bounds = wildcardBounds(rest);
  if (bounds !== null && bounds.wildcard) {
    const parsed = parseSemver(version);
    if (parsed === null) return false;
    if (bounds.major !== null && parsed.major !== bounds.major) return false;
    if (bounds.minor !== null && parsed.minor !== bounds.minor) return false;
    return true;
  }

  if (op === '^') {
    const floor = parseSemver(rest);
    const target = parseSemver(version);
    if (floor === null || target === null) return false;
    if (compareVersions(version, rest) < 0) return false;
    // Caret allows changes that do not modify the left-most non-zero digit.
    const ceiling =
      floor.major > 0
        ? `${floor.major + 1}.0.0`
        : floor.minor > 0
          ? `0.${floor.minor + 1}.0`
          : `0.0.${floor.patch + 1}`;
    return compareVersions(version, ceiling) < 0;
  }

  if (op === '~') {
    const floor = parseSemver(rest);
    if (floor === null) return false;
    if (compareVersions(version, rest) < 0) return false;
    return compareVersions(version, `${floor.major}.${floor.minor + 1}.0`) < 0;
  }

  const cmp = compareVersions(version, rest);
  if (op === '') return cmp === 0;
  if (op === '>') return cmp > 0;
  if (op === '>=') return cmp >= 0;
  if (op === '<') return cmp < 0;
  if (op === '<=') return cmp <= 0;
  if (op === '=') return cmp === 0;
  return false;
}

export function satisfiesRange(range: string, version: string): boolean {
  if (parseSemver(version) === null) return false;
  const alternatives = range.split('||');
  return alternatives.some((alt) => {
    const comparators = alt.trim().split(/\s+/).filter((c) => c.length > 0);
    if (comparators.length === 0) return true;
    return comparators.every((c) => satisfiesComparator(c, version));
  });
}
