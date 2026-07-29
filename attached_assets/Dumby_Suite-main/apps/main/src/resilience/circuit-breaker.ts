/**
 * Circuit breaker (cross-cutting resilience primitive used by the DB
 * client and queue/cache adapters — supports Clusters Bundles, Burg, and
 * Holder rather than belonging to a single one).
 *
 * Zero external dependencies; takes a clock function so it is deterministic
 * under test. States follow the standard model:
 *
 *   CLOSED --(failureThreshold reached)--> OPEN
 *   OPEN --(resetTimeoutMs elapsed)--> HALF_OPEN
 *   HALF_OPEN --(success)--> CLOSED
 *   HALF_OPEN --(failure)--> OPEN
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts?: number;
  now?: () => number;
}

export class CircuitOpenError extends Error {
  constructor(readonly nextAttemptAt: number) {
    super('Circuit breaker is OPEN');
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private openedAt = 0;
  private halfOpenAttempts = 0;
  private readonly now: () => number;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;

  constructor(options: CircuitBreakerOptions) {
    if (options.failureThreshold < 1) throw new RangeError('failureThreshold must be >= 1');
    if (options.resetTimeoutMs < 0) throw new RangeError('resetTimeoutMs must be >= 0');
    this.failureThreshold = options.failureThreshold;
    this.resetTimeoutMs = options.resetTimeoutMs;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 1;
    this.now = options.now ?? Date.now;
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && this.now() - this.openedAt >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      this.halfOpenAttempts = 0;
    }
    return this.state;
  }

  /** Call before attempting the guarded operation. Throws CircuitOpenError if blocked. */
  beforeCall(): void {
    const state = this.getState();
    if (state === 'OPEN') {
      throw new CircuitOpenError(this.openedAt + this.resetTimeoutMs);
    }
    if (state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        throw new CircuitOpenError(this.openedAt + this.resetTimeoutMs);
      }
      this.halfOpenAttempts += 1;
    }
  }

  onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.halfOpenAttempts = 0;
  }

  onFailure(): void {
    if (this.state === 'HALF_OPEN') {
      this.trip();
      return;
    }
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'OPEN';
    this.openedAt = this.now();
    this.halfOpenAttempts = 0;
  }

  /** Convenience wrapper for async operations. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.beforeCall();
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
