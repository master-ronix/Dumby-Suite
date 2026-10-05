import { describe, expect, it } from 'vitest';
import { readRepo, readSrc } from '../spec-utils.js';
// ACC-OPS-0028-2 — the concrete subclass set matches contracts/errors.json.
describe('ACC-OPS-0028-2 — error classes match contract', () => {
  it('every contract class is declared in taxonomy.ts', () => {
    const contract = JSON.parse(readRepo('docs/contracts/errors.json')) as {
      base: string;
      classes: string[];
    };
    const tax = readSrc('errors/taxonomy.ts');
    expect(tax).toContain(`class ${contract.base}`);
    for (const cls of contract.classes) {
      expect(tax, `missing ${cls}`).toContain(`class ${cls}`);
    }
  });
});
