import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * UR-C-13 / UR-B-21 (E5 §31) — CI hygiene: actions pinned to a commit SHA, secrets never
 * interpolated into a `run:` block, and Dependabot configured for both supply-chain surfaces.
 */
function repoFile(relative: string): string {
  return fileURLToPath(new URL(`../../../../${relative}`, import.meta.url));
}

const workflowsDir = repoFile('.github/workflows');
const workflowFiles = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

describe('M9 CI hygiene (UR-C-13 / UR-B-21)', () => {
  test('every action is pinned to a 40-hex commit SHA', () => {
    const unpinned: string[] = [];
    for (const file of workflowFiles) {
      const source = readFileSync(`${workflowsDir}/${file}`, 'utf8');
      for (const line of source.split('\n')) {
        const match = /^\s*uses:\s*([^\s#]+)/.exec(line);
        if (match === null) continue;
        const ref = match[1] ?? '';
        const [, pin] = ref.split('@');
        if (pin === undefined || !/^[0-9a-f]{40}$/.test(pin)) {
          unpinned.push(`${file}: ${ref}`);
        }
      }
    }
    expect(unpinned).toEqual([]);
  });

  test('no secret is interpolated into a run: block', () => {
    const offenders: string[] = [];
    for (const file of workflowFiles) {
      const source = readFileSync(`${workflowsDir}/${file}`, 'utf8');
      const lines = source.split('\n');
      let inRun = false;
      for (const line of lines) {
        if (/^\s*run:/.test(line)) inRun = true;
        else if (/^\s{0,8}\S/.test(line) && !/^\s{9,}/.test(line)) inRun = false;
        if (inRun && /\$\{\{\s*secrets\./.test(line)) offenders.push(`${file}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('Dependabot covers github-actions and npm', () => {
    const path = repoFile('.github/dependabot.yml');
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, 'utf8');
    expect(source).toMatch(/package-ecosystem:\s*github-actions/);
    expect(source).toMatch(/package-ecosystem:\s*npm/);
  });
});
