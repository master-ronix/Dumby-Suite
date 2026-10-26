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

// UR-20261026-098 — a refusal must be BOTH private in grammar AND private in delivery.
describe('UR-20261026-098 — the refusal notice is private, and is delivered privately', () => {
  it('declares the private grammar', () => {
    // The notice asks for the ephemeral grammar (no accent, no footer). That is only correct if the
    // message really is private — which is the second half of this test.
    const src = readSrc('bootstrap/bootstrap.ts');
    const notice = src.slice(src.indexOf('const moduleRefusalNotice'));
    const body = notice.slice(0, notice.indexOf('const moduleEnableConfirmation'));
    expect(body).not.toMatch(/^\s*ephemeral:\s*false,$/m);
    expect(body).toMatch(/^\s*ephemeral:\s*true,$/m);
  });

  it('is delivered with a follow-up, not by editing the publicly acknowledged message', () => {
    // `editReply` cannot change an existing message's ephemerality, and the registry has already
    // acknowledged the interaction with a public `deferUpdate`. A follow-up is a NEW message, and a
    // new message can be private. Riding the edit made the card private in grammar and public in
    // fact — the contradiction the operator reported.
    const src = readSrc('interactions/core-frame.handlers.ts');
    const start = src.indexOf("if (action === 'install')");
    const branch = src.slice(start, src.indexOf("if (action === 'profile')"));
    expect(branch).toMatch(/interaction\.followUp\?\.\(payload\)/);
    expect(branch).not.toMatch(/interaction\.editReply\(payload\)/);
  });

  it('the page controls declare the follow-up exception', () => {
    const src = readSrc('interactions/core-frame.handlers.ts');
    expect(src).toMatch(/allowFollowUp:\s*true/);
  });
});
