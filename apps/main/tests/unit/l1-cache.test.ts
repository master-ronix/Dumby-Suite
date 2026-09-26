import { test, expect } from 'vitest';
import { L1Cache } from '../../src/cache/l1-cache.js';

function makeCache(maxEntries = 100, maxBytes = 1_048_576) {
  return new L1Cache({ maxEntries, maxBytes });
}

test('get returns undefined for a key that was never set', () => {
  const cache = makeCache();
  expect(cache.get('missing')).toBeUndefined();
});

test('set and get roundtrip a string value', () => {
  const cache = makeCache();
  cache.set('key', 'hello', 5000);
  expect(cache.get('key')).toBe('hello');
});

test('set and get roundtrip an object value', () => {
  const cache = makeCache();
  const value = { a: 1, b: [2, 3] };
  cache.set('obj', value, 5000);
  expect(cache.get('obj')).toStrictEqual(value);
});

test('get returns undefined for an expired entry', async () => {
  const cache = makeCache();
  cache.set('key', 'value', 1);
  await new Promise((r) => setTimeout(r, 10));
  expect(cache.get('key')).toBeUndefined();
});

test('delete removes a key', () => {
  const cache = makeCache();
  cache.set('key', 'value', 5000);
  cache.delete('key');
  expect(cache.get('key')).toBeUndefined();
});

test('delete is a no-op for missing keys', () => {
  const cache = makeCache();
  expect(() => cache.delete('nonexistent')).not.toThrow();
});

test('has returns true for a live key', () => {
  const cache = makeCache();
  cache.set('key', 'value', 5000);
  expect(cache.has('key')).toBe(true);
});

test('has returns false for a missing key', () => {
  const cache = makeCache();
  expect(cache.has('missing')).toBe(false);
});

test('has returns false for an expired key', async () => {
  const cache = makeCache();
  cache.set('key', 'val', 1);
  await new Promise((r) => setTimeout(r, 10));
  expect(cache.has('key')).toBe(false);
});

test('size returns 0 on empty cache', () => {
  const cache = makeCache();
  expect(cache.size()).toBe(0);
});

test('size reflects number of set entries', () => {
  const cache = makeCache();
  cache.set('a', 1, 5000);
  cache.set('b', 2, 5000);
  expect(cache.size()).toBe(2);
});

test('clear empties the cache', () => {
  const cache = makeCache();
  cache.set('a', 1, 5000);
  cache.set('b', 2, 5000);
  cache.clear();
  expect(cache.size()).toBe(0);
  expect(cache.get('a')).toBeUndefined();
});

test('remainingTtlMs returns 0 for a missing key', () => {
  const cache = makeCache();
  expect(cache.remainingTtlMs('missing')).toBe(0);
});

test('remainingTtlMs returns a positive value for a live key', () => {
  const cache = makeCache();
  cache.set('key', 'val', 5000);
  expect(cache.remainingTtlMs('key')).toBeGreaterThan(0);
  expect(cache.remainingTtlMs('key')).toBeLessThanOrEqual(5000);
});

test('overwriting a key with a new set replaces the value', () => {
  const cache = makeCache();
  cache.set('key', 'first', 5000);
  cache.set('key', 'second', 5000);
  expect(cache.get('key')).toBe('second');
});

test('evicts oldest entries when max count is exceeded', () => {
  const cache = makeCache(2);
  cache.set('a', 1, 60_000);
  cache.set('b', 2, 60_000);
  cache.set('c', 3, 60_000);
  expect(cache.get('c')).toBe(3);
  expect(cache.size()).toBeLessThanOrEqual(2);
});
