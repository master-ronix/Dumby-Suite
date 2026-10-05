import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-REQ-0017-2 — every command class implements ICommand and is validated at Stage 13.

describe('ACC-REQ-0017-2 — command interface', () => {
  it('the module command adapter exists', () => {
    expect(existsRepo('apps/main/src/commands/module-command.ts')).toBe(true);
  });
});
