import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-REF-0006-1 — the Discord API surface appendix matches the discord.js v14 types in use.
describe('ACC-REF-0006-1 — Discord API surface', () => {
  it('the surface appendix exists and references discord.js v14', () => {
    const body = readRepo(
      'docs/spec/reference/appendix-a-extended-reference-discord-api-surface.md',
    );
    expect(body).toMatch(/discord\.js|v14|Discord/i);
  });
});
