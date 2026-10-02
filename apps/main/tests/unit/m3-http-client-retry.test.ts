import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  HttpClient,
  isRetryableStatus,
  parseRetryAfter,
} from '../../src/http/client.js';
import type { CircuitBreaker } from '../../src/resilience/circuit-breaker.js';
import type { Logger } from '../../src/logging/logger.js';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

const passThroughBreaker = {
  execute: async (fn: () => Promise<unknown>) => fn(),
} as unknown as CircuitBreaker;

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as unknown as Logger;

function client(): HttpClient {
  return new HttpClient({ logger: silentLogger, circuitBreaker: passThroughBreaker });
}

describe('M3 http client — 429 / Retry-After retry (UR-C-29)', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('a 429 with Retry-After is retried and the next success is returned', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(429, { error: 'slow down' }, { 'retry-after': '0' })
          : jsonResponse(200, { ok: true });
      }),
    );
    const res = await client().get('/x');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  test('a 429 that never clears returns the final response after exhausting retries', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return jsonResponse(429, { error: 'slow down' }, { 'retry-after': '0' });
      }),
    );
    const res = await client().get('/x');
    expect(res.status).toBe(429);
    expect(res.data).toEqual({ error: 'slow down' });
    expect(calls).toBe(3);
  });

  test('a non-retryable status is not retried', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1;
        return jsonResponse(400, { error: 'bad request' });
      }),
    );
    const res = await client().get('/x');
    expect(res.status).toBe(400);
    expect(calls).toBe(1);
  });

  test('isRetryableStatus and parseRetryAfter', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('not-a-date')).toBeUndefined();
  });
});
