import { describe, expect, it } from 'vitest';
import { srcFiles } from '../spec-utils.js';
// ACC-REQ-0004-3 — classic embeds are banned: no EmbedBuilder/MessageEmbed import passes the lint/grep gate.
describe('ACC-REQ-0004-3 — embed ban', () => {
  it('no classic embed construct is reachable in src/', () => {
    expect(
      srcFiles()
        .filter((f) => /\b(EmbedBuilder|MessageEmbed)\b/.test(f.source))
        .map((f) => f.path),
    ).toEqual([]);
  });
});
