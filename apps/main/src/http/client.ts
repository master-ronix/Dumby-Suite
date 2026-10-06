import type { CircuitBreaker } from '../resilience/circuit-breaker.js';
import type { Logger } from '../logging/logger.js';
import { withRetry } from '../shared/utils/retry.js';

export class HttpRetryableError extends Error {
  override readonly name = 'HttpRetryableError';
  constructor(
    readonly status: number,
    readonly retryAfterMs: number | undefined,
    readonly response: Response,
  ) {
    super(`retryable HTTP status ${status}`);
  }
}

/** §28 — a 429 or any 5xx is retryable; everything else is the caller's problem. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** `Retry-After` is delta-seconds or an HTTP-date. */
export function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(value);
  if (!Number.isNaN(at)) return Math.max(0, at - Date.now());
  return undefined;
}

function collectHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface HttpClientDeps {
  logger: Logger;
  circuitBreaker: CircuitBreaker;
  defaultTimeoutMs?: number;
}

export class HttpClient {
  private readonly defaultTimeoutMs: number;

  constructor(private readonly deps: HttpClientDeps) {
    this.defaultTimeoutMs = deps.defaultTimeoutMs ?? 10_000;
  }

  async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
    const { method, url, body, timeoutMs = this.defaultTimeoutMs } = options;
    const headers = options.headers ?? {};

    const attempt = async (): Promise<HttpResponse<T>> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await this.deps.circuitBreaker.execute(async () => {
          const init: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            signal: controller.signal,
          };
          if (body !== undefined) {
            init.body = JSON.stringify(body);
          }
          return await globalThis.fetch(url, init);
        });
        clearTimeout(timer);
        // §28 (UR-C-29): a 429 or 5xx carries a server hint (`Retry-After`) and is retried by
        // the shared RetryPolicy rather than surfaced immediately.
        if (isRetryableStatus(response.status)) {
          throw new HttpRetryableError(
            response.status,
            parseRetryAfter(response.headers.get('retry-after')),
            response,
          );
        }
        const data = (await response.json()) as T;
        return { status: response.status, data, headers: collectHeaders(response.headers) };
      } catch (err) {
        clearTimeout(timer);
        if (!(err instanceof HttpRetryableError)) {
          this.deps.logger.error('http-client-error', { method, url, error: String(err) });
        }
        throw err;
      }
    };

    try {
      return await withRetry(attempt, {
        retryOn: (err) => err instanceof HttpRetryableError,
        retryAfterMs: (err) => (err instanceof HttpRetryableError ? err.retryAfterMs : undefined),
      });
    } catch (err) {
      if (err instanceof HttpRetryableError) {
        // Retries exhausted — surface the final response so the caller still sees the 429/5xx.
        const data = (await err.response.json().catch(() => ({}))) as T;
        return {
          status: err.response.status,
          data,
          headers: collectHeaders(err.response.headers),
        };
      }
      throw err;
    }
  }

  async get<T = unknown>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', url, headers: headers ?? {} });
  }

  async post<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', url, body, headers: headers ?? {} });
  }

  async put<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PUT', url, body, headers: headers ?? {} });
  }

  async patch<T = unknown>(
    url: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, body, headers: headers ?? {} });
  }

  async delete<T = unknown>(
    url: string,
    headers?: Record<string, string>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, headers: headers ?? {} });
  }
}
