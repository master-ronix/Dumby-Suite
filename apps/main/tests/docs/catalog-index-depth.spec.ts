import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-MOD-0036-1 — the module catalog is illustrative index-depth only.
describe('ACC-MOD-0036-1 — catalog index depth', () => {
  it('the catalog index exists and is marked illustrative', () => {
    const body = readRepo(
      'docs/spec/modules/catalog/catalog-conventions-illustrative-module-index.md',
    );
    expect(body).toMatch(/illustrative/i);
  });
});
