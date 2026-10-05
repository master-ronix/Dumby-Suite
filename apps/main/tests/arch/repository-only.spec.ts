import { describe, expect, it } from 'vitest';
import { readRepo, listDir } from '../spec-utils.js';
// ACC-DATA-0024-3 — the repository pattern is the sole DB abstraction; no raw query helpers in command/service code.
describe('ACC-DATA-0024-3 — repository only', () => {
  it('command and service code does not bypass repositories with raw knex', () => {
    const offenders: string[] = [];
    for (const area of ['commands', 'config']) {
      const dir = `apps/main/src/${area}`;
      for (const f of listDir(dir)) {
        if (f.endsWith('.ts') && /this\.db\.knex\(|db\.knex\(/.test(readRepo(`${dir}/${f}`)))
          offenders.push(`${area}/${f}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
