import { describe, expect, it } from 'vitest';
import { readRepo } from '../spec-utils.js';
// ACC-GOV-0002-1 / ACC-GOV-0001-1 — the charter defines authority, precedence, RFC-2119 language, scope.
describe('ACC-GOV-0001-1/0002-1 — governance charter', () => {
  it('states normative MUST/SHALL language and precedence', () => {
    const body = readRepo('docs/spec/governance/directive-charter-how-to-use-this-document.md');
    expect(body).toMatch(/MUST|SHALL/);
    expect(body).toMatch(/precedence|authority/i);
  });
});
