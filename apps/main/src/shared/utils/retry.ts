export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  retryOn?: (error: unknown) => boolean;
  /**
   * §28 — a server-supplied delay (e.g. `Retry-After` on a 429). When it returns a number that
   * delay is used — still jittered — instead of the exponential backoff.
   */
  retryAfterMs?: (error: unknown) => number | undefined;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    jitterFactor = 0.2,
    retryOn = () => true,
    retryAfterMs,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !retryOn(err)) throw err;

      const hinted = retryAfterMs?.(err);
      const base =
        hinted !== undefined
          ? Math.min(hinted, maxDelayMs)
          : Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = base * jitterFactor * (Math.random() * 2 - 1);
      await new Promise((r) => setTimeout(r, Math.max(0, base + jitter)));
    }
  }
  throw lastError;
}
