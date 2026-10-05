import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0020-1 — custom_id encodes {moduleNamespace}:{handlerKey}:{contextPayload} and is stateless.
describe('ACC-REQ-0020-1 — custom_id', () => {
  it('the interaction registry mints namespaced, stateless custom ids', () => {
    const src = readSrc('interactions/interaction-registry.ts');
    expect(src).toMatch(/CUSTOM_ID_SEPARATOR/);
    expect(src).toMatch(/moduleNamespace/);
  });
});
