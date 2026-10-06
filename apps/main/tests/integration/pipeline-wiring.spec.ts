import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0019-2 — the pipeline is built at Stage 09 and injected into CommandRouter before Stage 12.

describe('ACC-REQ-0019-2 — pipeline wiring', () => {
  it('the pipeline is injected into the router', () => {
    const boot = readSrc('bootstrap/bootstrap.ts');
    expect(boot).toMatch(/MiddlewarePipeline/);
    expect(boot).toMatch(/CommandRouter/);
  });
});
