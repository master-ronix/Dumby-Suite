import { describe, expect, it } from 'vitest';
import { readRepo, listDir } from '../spec-utils.js';
// ACC-ARCH-0010-6 — the repository pattern is the sole DB abstraction; no-repository-in-command lint passes.
describe('ACC-ARCH-0010-6 — repository pattern', () => {
  it('no command file touches the raw knex client', () => {
    const dir = 'apps/main/src/commands';
    const offenders = listDir(dir).filter(
      (f) => f.endsWith('.ts') && /db\.knex|this\.db\.knex/.test(readRepo(`${dir}/${f}`)),
    );
    expect(offenders).toEqual([]);
  });
});
