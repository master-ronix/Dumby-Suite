import { describe, expect, it } from 'vitest';
import { existsRepo, readSrc } from '../spec-utils.js';
// ACC-ARCH-0007-2 — src/entry/ contains the ten process entrypoints and each is guarded by isMainEntry.
describe('ACC-ARCH-0007-2 — entry guards', () => {
  const ten = [
    'main.ts',
    'worker.ts',
    'migrate.ts',
    'power-engine.ts',
    'ssh-clai.ts',
    'swastik.ts',
    'credentials.ts',
    'twill.ts',
    'is-main-entry.ts',
    'clai-session-limits.ts',
  ];
  it('all ten entry files exist', () => {
    for (const f of ten) expect(existsRepo(`apps/main/src/entry/${f}`)).toBe(true);
  });
  it('every startable entrypoint is behind isMainEntry', () => {
    for (const f of [
      'main.ts',
      'worker.ts',
      'migrate.ts',
      'power-engine.ts',
      'ssh-clai.ts',
      'swastik.ts',
      'credentials.ts',
      'twill.ts',
    ]) {
      expect(readSrc(`entry/${f}`)).toMatch(/isMainEntry\(import\.meta\.url, process\.argv\[1\]\)/);
    }
  });
});
