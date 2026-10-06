export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  retryOn?: (error: unknown) => boolean;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    jitterFactor = 0.2,
    retryOn = () => true,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !retryOn(err)) throw err;

      const base = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = base * jitterFactor * (Math.random() * 2 - 1);
      await new Promise((r) => setTimeout(r, Math.max(0, base + jitter)));
    }
  }
  throw lastError;
}
