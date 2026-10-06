import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REF-0046-1 — the capability comparison asserts only documented, testable differentiators.
describe('ACC-REF-0046-1 — capability comparison', () => {
  it('the comparison document exists', () => {
    expect(
      existsRepo('docs/spec/reference/dumby-vs-multipurpose-bots-capability-comparison.md'),
    ).toBe(true);
  });
});
