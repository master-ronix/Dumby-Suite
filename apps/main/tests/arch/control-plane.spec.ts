import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-GOV-0008-1 — the five control-plane services are separately-built and share only PostgreSQL/Redis/image.
describe('ACC-GOV-0008-1 — control plane', () => {
  it('the five control-plane entrypoints exist as typed stubs', () => {
    for (const f of [
      'power-engine.ts',
      'ssh-clai.ts',
      'swastik.ts',
      'credentials.ts',
      'twill.ts',
    ]) {
      expect(existsRepo(`apps/main/src/entry/${f}`)).toBe(true);
    }
  });
});
