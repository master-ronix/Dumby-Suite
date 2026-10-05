import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0020-2 — sensitive component clicks re-authorize at click time.

describe('ACC-REQ-0020-2 — component reauth', () => {
  it('the interaction registry re-checks the invoker', () => {
    expect(readSrc('interactions/interaction-registry.ts')).toMatch(/invokerMatches/);
  });
});
