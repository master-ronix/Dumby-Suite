import { describe, expect, it } from 'vitest';
import { srcFiles } from '../spec-utils.js';
// ACC-GOV-0003-1 / ACC-FOUND-0004-1 — the Ban Registry: prefix commands, classic embeds, unsolicited DMs.
describe('ACC-GOV-0003-1 — Ban Registry', () => {
  const files = srcFiles();
  it('Ban 2 — no classic embed construction or import', () => {
    expect(
      files.filter((f) => /\b(EmbedBuilder|MessageEmbed)\b/.test(f.source)).map((f) => f.path),
    ).toEqual([]);
  });
  it('Ban 1 — no text-prefix command parsing', () => {
    expect(
      files
        .filter((f) => /(?:content|message)\s*\.\s*startsWith\(\s*['"][!/]/.test(f.source))
        .map((f) => f.path),
    ).toEqual([]);
  });
  it('Ban 3 — the main bot never opens a DM channel', () => {
    expect(
      files.filter((f) => /createDM\(|\.createDM\b/.test(f.source)).map((f) => f.path),
    ).toEqual([]);
  });
});
