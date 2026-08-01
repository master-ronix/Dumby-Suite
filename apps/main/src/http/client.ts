import type { CircuitBreaker } from '../resilience/circuit-breaker.js';
import type { Logger } from '../logging/logger.js';

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
      const data = (await response.json()) as T;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        responseHeaders[k] = v;
      });

      return { status: response.status, data, headers: responseHeaders };
    } catch (err) {
      clearTimeout(timer);
      this.deps.logger.error('http-client-error', { method, url, error: String(err) });
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
