import { test, expect } from 'vitest';
import {
  seal,
  open,
  rotate,
  randomRootKey,
  rootKeyFromBase64,
  toBase64,
  fromBase64,
  keyIdsEqual,
  ENVELOPE_ALGORITHM,
} from '@workspace/swastik';

const enc = (s: string) => new TextEncoder().encode(s);

test('seal/open round-trips and rotate re-wraps under a new root key', () => {
  const rk = randomRootKey('k1');
  const pt = enc('top secret');
  const rec = seal(pt, rk);
  expect(rec.algorithm).toBe(ENVELOPE_ALGORITHM);
  expect(rec.kid).toBe('k1');
  expect(open(rec, rk)).toStrictEqual(pt);

  const rk2 = randomRootKey('k2');
  const rotated = rotate(rec, rk, rk2);
  expect(rotated.kid).toBe('k2');
  expect(open(rotated, rk2)).toStrictEqual(pt);
});

test('open fails on tampered ciphertext and on the wrong root key', () => {
  const rk = randomRootKey('k');
  const rec = seal(enc('x'), rk);
  expect(() => open({ ...rec, ciphertext: toBase64(new Uint8Array([1, 2, 3])) }, rk)).toThrow();
  expect(() => open(rec, randomRootKey('other'))).toThrow();
});

test('open rejects an unsupported algorithm', () => {
  const rk = randomRootKey('k');
  const rec = seal(enc('x'), rk);
  expect(() => open({ ...rec, algorithm: 'AES-128-GCM' as never }, rk)).toThrow(/unsupported/);
});

test('rootKeyFromBase64 validates material length', () => {
  const good = toBase64(new Uint8Array(32).fill(7));
  expect(rootKeyFromBase64('k', good).material.byteLength).toBe(32);
  expect(() => rootKeyFromBase64('k', '')).toThrow();
  expect(() => rootKeyFromBase64('k', toBase64(new Uint8Array(5)))).toThrow();
});

test('keyIdsEqual compares in constant time and rejects length mismatch', () => {
  expect(keyIdsEqual('abc', 'abc')).toBe(true);
  expect(keyIdsEqual('abc', 'abd')).toBe(false);
  expect(keyIdsEqual('abc', 'abcd')).toBe(false);
});

test('base64 helpers round-trip', () => {
  const bytes = new Uint8Array([1, 2, 3, 250]);
  expect(fromBase64(toBase64(bytes))).toStrictEqual(bytes);
});
