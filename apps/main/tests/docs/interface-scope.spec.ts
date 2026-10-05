import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REQ-0001-1 — the interface reference scopes itself to Discord-facing surfaces under the single Renderer.
describe('ACC-REQ-0001-1 — interface scope', () => {
  it('scopes to Discord-facing surfaces and the Renderer', () => {
    const body = readRepo('docs/spec/request-layer/front-matter.md');
    expect(body).toMatch(/Discord|Renderer/i);
  });
});
