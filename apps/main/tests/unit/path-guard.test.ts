import { test, expect } from 'vitest';
import {
  safeJoin,
  assertPathInside,
  assertSafeSlug,
  assertSafeVersion,
} from '../../src/shared/utils/path-guard.js';

test('safeJoin joins a relative segment inside the root', () => {
  expect(safeJoin('/root', 'a/b')).toBe('/root/a/b');
});

test('safeJoin rejects traversal, absolute, empty and NUL segments', () => {
  expect(() => safeJoin('/root', '../etc')).toThrow(/escapes/);
  expect(() => safeJoin('/root', '/abs')).toThrow(/relative/);
  expect(() => safeJoin('/root', '')).toThrow(/empty/);
  expect(() => safeJoin('/root', 'a\0b')).toThrow(/NUL/);
});

test('assertPathInside accepts inside paths and rejects escapes', () => {
  expect(() => assertPathInside('/root', '/root/x/y')).not.toThrow();
  expect(() => assertPathInside('/root', '/other')).toThrow(/escapes/);
});

test('assertSafeSlug enforces lowercase kebab-case', () => {
  expect(assertSafeSlug('my-mod')).toBe('my-mod');
  expect(() => assertSafeSlug('Bad_Slug')).toThrow();
  expect(() => assertSafeSlug('1bad')).toThrow();
});

test('assertSafeVersion enforces semver-like strings', () => {
  expect(assertSafeVersion('1.2.3')).toBe('1.2.3');
  expect(assertSafeVersion('1.2.3-beta.1')).toBe('1.2.3-beta.1');
  expect(() => assertSafeVersion('1.2')).toThrow();
});
