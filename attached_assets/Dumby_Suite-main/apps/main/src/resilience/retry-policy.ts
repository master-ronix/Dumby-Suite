/**
 * Retry policy (cross-cutting resilience primitive, same rationale as
 * circuit-breaker.ts). Exponential backoff with full jitter,
 * capped at maxDelayMs. Pure function of (attempt) -> delayMs so it is
 * trivially testable without timers.
 */

export interface RetryPolicyOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number;
}

export class RetryExhaustedError extends Error {
  constructor(readonly attempts: number, readonly lastError: unknown) {
    super(`Retry exhausted after ${attempts} attempt(s)`);
    this.name = 'RetryExhaustedError';
  }
}

export class RetryPolicy {
  private readonly random: () => number;

  constructor(private readonly options: RetryPolicyOptions) {
    if (options.maxAttempts < 1) throw new RangeError('maxAttempts must be >= 1');
    this.random = options.random ?? Math.random;
  }

  /** Full-jitter exponential backoff: delay = random(0, min(maxDelay, base * 2^attempt)). */
  delayForAttempt(attempt: number): number {
    if (attempt < 0) throw new RangeError('attempt must be >= 0');
    const exp = Math.min(this.options.maxDelayMs, this.options.baseDelayMs * 2 ** attempt);
    return Math.floor(this.random() * exp);
  }

  async execute<T>(fn: (attempt: number) => Promise<T>, sleep: (ms: number) => Promise<void> = defaultSleep): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.options.maxAttempts; attempt += 1) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;
        if (attempt < this.options.maxAttempts - 1) {
          await sleep(this.delayForAttempt(attempt));
        }
      }
    }
    throw new RetryExhaustedError(this.options.maxAttempts, lastError);
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
