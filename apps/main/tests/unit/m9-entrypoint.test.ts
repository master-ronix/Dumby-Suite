import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isMainEntry } from '../../src/entry/is-main-entry.js';

test('isMainEntry matches an absolute argv[1] to the module URL', () => {
  expect(isMainEntry('file:///app/dist/entry/main.js', '/app/dist/entry/main.js')).toBe(true);
});

test('isMainEntry matches a relative argv[1] resolved against the cwd', () => {
  const moduleUrl = pathToFileURL('src/entry/main.ts').href;
  expect(isMainEntry(moduleUrl, 'src/entry/main.ts')).toBe(true);
});

test('isMainEntry returns false for a different module or missing argv[1]', () => {
  expect(isMainEntry('file:///app/src/entry/worker.ts', 'file:///app/src/entry/main.ts')).toBe(
    false,
  );
  expect(isMainEntry('file:///app/src/entry/main.ts', undefined)).toBe(false);
  expect(isMainEntry('file:///app/src/entry/main.ts', '')).toBe(false);
});

test('isMainEntry is false when argv[1] is not a file the module URL can name', () => {
  expect(isMainEntry('file:///app/src/entry/main.ts', '\u0000invalid')).toBe(false);
});

test('entry files only run bootstrap under the isolated main-module guard (UR-C-23)', () => {
  for (const name of ['main.ts', 'worker.ts']) {
    const src = readFileSync(new URL(`../../src/entry/${name}`, import.meta.url), 'utf8');
    expect(src).toContain('isMainEntry(import.meta.url, process.argv[1])');
    expect(src).toMatch(/if \(isMainEntry/);
    expect(src).toContain('bootstrap().catch(');
  }
});
