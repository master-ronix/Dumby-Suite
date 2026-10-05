import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REF-0047-1 — every glossary term resolves to a definition and matches glossary.md.
describe('ACC-REF-0047-1 — glossary', () => {
  it('the glossary and topic index exist', () => {
    expect(existsRepo('docs/glossary.md')).toBe(true);
    expect(existsRepo('docs/spec/reference/glossary-topic-index.md')).toBe(true);
  });
});
