import { describe, expect, it } from 'vitest';
import { readRepo, listDir } from '../spec-utils.js';
// ACC-DATA-0024-2 — every migration is reversible (a working down exists).

describe('ACC-DATA-0024-2 — reversible migrations', () => {
  it('every migration exports a down()', () => {
    const dir = 'apps/main/src/db/migrations';
    const offenders = listDir(dir).filter(
      (f) => f.endsWith('.ts') && !/export async function down/.test(readRepo(`${dir}/${f}`)),
    );
    expect(offenders).toEqual([]);
  });
});
