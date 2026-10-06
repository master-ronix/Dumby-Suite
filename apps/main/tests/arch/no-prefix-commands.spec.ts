import { describe, expect, it } from 'vitest';
import { readSrc, srcFiles } from '../spec-utils.js';
// ACC-REQ-0017-1 — only interaction-based command types are supported; no text-prefix command path exists.
describe('ACC-REQ-0017-1 — no prefix commands', () => {
  it('the MessageContent intent is never requested', () => {
    expect(readSrc('discord/client-builder.ts')).toMatch(/computeIntentsBitfield/);
  });
  it('no message-content handler exists in src/', () => {
    expect(
      srcFiles()
        .filter((f) => /\bmessageCreate\b|\.on\(\s*['"]message['"]/.test(f.source))
        .map((f) => f.path),
    ).toEqual([]);
  });
});
