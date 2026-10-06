import { test, expect, vi, afterEach } from 'vitest';
import { HttpClient, isRetryableStatus, parseRetryAfter } from '../../src/http/client.js';

const logger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
} as never;
const breaker = { execute: (fn: () => Promise<unknown>) => fn() } as never;

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('isRetryableStatus: 429 and 5xx only', () => {
  expect(isRetryableStatus(200)).toBe(false);
  expect(isRetryableStatus(404)).toBe(false);
  expect(isRetryableStatus(429)).toBe(true);
  expect(isRetryableStatus(500)).toBe(true);
  expect(isRetryableStatus(503)).toBe(true);
});

test('parseRetryAfter handles seconds, HTTP-date, invalid and null', () => {
  expect(parseRetryAfter(null)).toBeUndefined();
  expect(parseRetryAfter('2')).toBe(2000);
  expect(parseRetryAfter('nonsense')).toBeUndefined();
  const ms = parseRetryAfter(new Date(Date.now() + 5000).toUTCString());
  expect(ms).toBeGreaterThan(3000);
});

test('a successful request parses data, headers and serialises the body', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200, { 'x-a': 'b' }));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HttpClient({ logger, circuitBreaker: breaker });
  const res = await client.post('https://x/y', { a: 1 }, { 'x-h': '1' });
  expect(res.status).toBe(200);
  expect(res.data).toStrictEqual({ ok: true });
  expect(res.headers['x-a']).toBe('b');
  const init = fetchMock.mock.calls[0]![1] as RequestInit;
  expect(init.method).toBe('POST');
  expect(init.body).toBe(JSON.stringify({ a: 1 }));
});

test('get/put/patch/delete build the right HTTP methods', async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({})));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HttpClient({ logger, circuitBreaker: breaker });
  await client.get('u');
  await client.put('u', { a: 1 });
  await client.patch('u', { a: 1 });
  await client.delete('u');
  expect(fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method)).toStrictEqual([
    'GET',
    'PUT',
    'PATCH',
    'DELETE',
  ]);
});

test('a retryable status is retried and can then succeed', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ e: 1 }, 500, { 'retry-after': '0' }))
    .mockResolvedValueOnce(jsonResponse({ ok: 1 }, 200));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HttpClient({ logger, circuitBreaker: breaker });
  const res = await client.get('u');
  expect(res.status).toBe(200);
  expect(fetchMock).toHaveBeenCalledTimes(2);
}, 10_000);

test('exhausted retries surface the final retryable response', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(jsonResponse({ e: 'down' }, 503, { 'retry-after': '0' }));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HttpClient({ logger, circuitBreaker: breaker });
  const res = await client.get('u');
  expect(res.status).toBe(503);
  expect(fetchMock).toHaveBeenCalledTimes(3);
}, 15_000);

test('a non-retryable network error is logged and rethrown', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new Error('boom'));
  vi.stubGlobal('fetch', fetchMock);
  const client = new HttpClient({ logger, circuitBreaker: breaker });
  await expect(client.get('u')).rejects.toThrow(/boom/);
  expect((logger as { error: ReturnType<typeof vi.fn> }).error).toHaveBeenCalled();
});
