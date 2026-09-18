/**
 * Shared utility functions (Cluster: Core shared).
 */
export * from './components-v2.js';

/** Sleep for a given number of milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns true if value is a non-null object. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Chunks an array into sub-arrays of at most `size` elements. */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Deduplicates an array preserving insertion order. */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Safely parses a JSON string; returns undefined on parse failure
 * rather than throwing.
 */
export function tryParseJson<T = unknown>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Truncate a string with an ellipsis if it exceeds maxLen. */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/** Wait for all promises, collecting both resolved values and errors. */
export async function allSettledValues<T>(
  promises: Promise<T>[],
): Promise<{ values: T[]; errors: unknown[] }> {
  const results = await Promise.allSettled(promises);
  const values: T[] = [];
  const errors: unknown[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') values.push(r.value);
    else errors.push(r.reason);
  }
  return { values, errors };
}
