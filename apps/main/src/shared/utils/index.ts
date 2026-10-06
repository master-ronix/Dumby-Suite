export * from './components-v2.js';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function tryParseJson<T = unknown>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

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
