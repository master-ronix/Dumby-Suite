import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * UR-C-23 (findings #11/#16) — the entry points ran their side effects at module scope behind no
 * `isMainEntry` guard, so none could be imported in a unit test. Each now guards its start.
 */
const ENTRY_POINTS = [
  'main.ts',
  'worker.ts',
  'pep.ts',
  'ssh-clai.ts',
  'credentials.ts',
  'swastik.ts',
  'twixter.ts',
];

function entrySource(file: string): string {
  return readFileSync(fileURLToPath(new URL(`../../src/entry/${file}`, import.meta.url)), 'utf8');
}

describe('M9 UR-C-23 — every entry point guards its start', () => {
  for (const file of ENTRY_POINTS) {
    test(`${file} is behind isMainEntry`, () => {
      const source = entrySource(file);
      expect(source).toMatch(/import \{ isMainEntry \} from '\.\/is-main-entry\.js';/);
      expect(source).toMatch(/isMainEntry\(import\.meta\.url, process\.argv\[1\]\)/);
    });
  }
});
