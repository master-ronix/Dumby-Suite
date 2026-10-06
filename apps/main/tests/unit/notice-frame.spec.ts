import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0005-3 — formal notice frames carry a machine-readable reason code and a trace correlation id.
describe('ACC-REQ-0005-3 — notice frame', () => {
  it('renderNotice emits reason and trace', () => {
    const src = readSrc('rendering/core-renderer.ts');
    expect(src).toMatch(/reason: \$\{input\.reason\}/);
    expect(src).toMatch(/trace: \$\{input\.traceId\}/);
  });
});
