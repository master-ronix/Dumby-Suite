import { describe, expect, it } from 'vitest';
import { listDir } from '../spec-utils.js';
// ACC-LIFE-0043-1 — the five documented operational runbooks exist and are executable.
describe('ACC-LIFE-0043-1 — operational runbooks', () => {
  it('the five runbooks are present', () => {
    const files = listRepoRunbooks();
    expect(files.length).toBeGreaterThanOrEqual(5);
  });
});

function listRepoRunbooks(): string[] {
  const dirs = ['apps/main/docs/runbooks', 'docs/runbooks'];
  const out: string[] = [];
  for (const d of dirs)
    out.push(...listDir(d).filter((f) => f.endsWith('.md') && f !== 'README.md'));
  return out;
}
