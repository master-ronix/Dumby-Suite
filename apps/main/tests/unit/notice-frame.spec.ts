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

// UR-20261026-097 — the refusal notice must DECLARE the grammar it is actually delivered with.
describe('UR-20261026-097 — a refusal notice is not declared private when it is delivered publicly', () => {
  it('the module-refusal notice does not ask for the ephemeral grammar', () => {
    // It is answered with `editReply` on an interaction the component registry already acknowledged
    // with `deferUpdate` — a PUBLIC acknowledgement — and `editReply` cannot change the ephemerality
    // of a message that already exists. Declaring `ephemeral: true` asked for the private grammar
    // (no accent, no footer) on a message the whole channel can see, which is the contradiction the
    // operator reported: "no accent, and not hidden".
    const src = readSrc('bootstrap/bootstrap.ts');
    const notice = src.slice(src.indexOf('const moduleRefusalNotice'));
    const body = notice.slice(0, notice.indexOf('const moduleEnableConfirmation'));
    // Property-anchored: the surrounding prose may legitimately NAME the old declaration.
    expect(body).not.toMatch(/^\s*ephemeral:\s*true,$/m);
    expect(body).toMatch(/^\s*ephemeral:\s*false,$/m);
  });
});
