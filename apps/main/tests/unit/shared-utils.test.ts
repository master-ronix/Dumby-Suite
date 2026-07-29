import { test, expect, describe } from 'vitest';
import { sleep, isObject, chunk, unique, tryParseJson, truncate, allSettledValues } from '../../src/shared/utils/index.js';

describe('sleep', () => {
  test('resolves after approximately the given number of milliseconds', async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  test('resolves for 0ms', async () => {
    await expect(sleep(0)).resolves.toBeUndefined();
  });
});

describe('isObject', () => {
  test('returns true for a plain object', () => {
    expect(isObject({ a: 1 })).toBe(true);
  });

  test('returns false for null', () => {
    expect(isObject(null)).toBe(false);
  });

  test('returns false for an array', () => {
    expect(isObject([1, 2, 3])).toBe(false);
  });

  test('returns false for a string', () => {
    expect(isObject('hello')).toBe(false);
  });

  test('returns false for a number', () => {
    expect(isObject(42)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isObject(undefined)).toBe(false);
  });
});

describe('chunk', () => {
  test('splits an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
  });

  test('returns one chunk when size >= array length', () => {
    expect(chunk([1, 2, 3], 10)).toStrictEqual([[1, 2, 3]]);
  });

  test('returns an empty array for an empty input', () => {
    expect(chunk([], 3)).toStrictEqual([]);
  });

  test('returns singleton chunks for size 1', () => {
    expect(chunk([1, 2, 3], 1)).toStrictEqual([[1], [2], [3]]);
  });
});

describe('unique', () => {
  test('deduplicates an array preserving insertion order', () => {
    expect(unique([1, 2, 1, 3, 2])).toStrictEqual([1, 2, 3]);
  });

  test('returns an empty array for an empty input', () => {
    expect(unique([])).toStrictEqual([]);
  });

  test('returns the same array when all elements are unique', () => {
    expect(unique([1, 2, 3])).toStrictEqual([1, 2, 3]);
  });

  test('works with strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toStrictEqual(['a', 'b', 'c']);
  });
});

describe('tryParseJson', () => {
  test('parses valid JSON', () => {
    expect(tryParseJson('{"a":1}')).toStrictEqual({ a: 1 });
  });

  test('returns undefined for invalid JSON', () => {
    expect(tryParseJson('not json')).toBeUndefined();
  });

  test('parses a JSON array', () => {
    expect(tryParseJson('[1,2,3]')).toStrictEqual([1, 2, 3]);
  });

  test('parses a JSON string', () => {
    expect(tryParseJson('"hello"')).toBe('hello');
  });
});

describe('truncate', () => {
  test('returns the string unchanged when it is within maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  test('truncates and appends ellipsis when over maxLen', () => {
    const result = truncate('hello world', 8);
    expect(result.length).toBe(8);
    expect(result.endsWith('...')).toBe(true);
  });

  test('returns the full string when length equals maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  test('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('allSettledValues', () => {
  test('returns all resolved values', async () => {
    const { values, errors } = await allSettledValues([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]);
    expect(values).toStrictEqual([1, 2, 3]);
    expect(errors).toStrictEqual([]);
  });

  test('separates resolved values from rejected errors', async () => {
    const err = new Error('fail');
    const { values, errors } = await allSettledValues([
      Promise.resolve(1),
      Promise.reject(err),
      Promise.resolve(3),
    ]);
    expect(values).toStrictEqual([1, 3]);
    expect(errors).toStrictEqual([err]);
  });

  test('handles all rejections', async () => {
    const { values, errors } = await allSettledValues([
      Promise.reject('a'),
      Promise.reject('b'),
    ]);
    expect(values).toStrictEqual([]);
    expect(errors).toStrictEqual(['a', 'b']);
  });

  test('handles an empty array', async () => {
    const { values, errors } = await allSettledValues([]);
    expect(values).toStrictEqual([]);
    expect(errors).toStrictEqual([]);
  });
});
