/**
 * DLQ monitoring and queue autoscaling decisions (Cluster: Burg), kept as
 * pure functions of (counts/depths) -> decision so they can be unit tested
 * without a real BullMQ/Redis connection. The real QueueManager
 * (src/queue/queue-manager.ts) calls these every tick and only the actual
 * BullMQ API calls (pause/resume/retry, worker concurrency) touch I/O.
 */

export interface DlqCheckResult {
  queue: string;
  failedCountLastHour: number;
  shouldAlert: boolean;
}

/** DLQMonitor runs every 15 minutes; alerts when more than 10 failed jobs landed in the trailing hour. */
export class DlqMonitor {
  constructor(private readonly alertThreshold = 10) {}

  evaluate(queue: string, failedCountLastHour: number): DlqCheckResult {
    return { queue, failedCountLastHour, shouldAlert: failedCountLastHour > this.alertThreshold };
  }
}

export type ScalingAction = 'scale-up' | 'scale-down' | 'hold';

export interface ScalingDecision {
  action: ScalingAction;
  newConcurrency: number;
}

/**
 * WorkerManager autoscaling: +1 worker per 30s while depth is growing,
 * -1 worker after 5 consecutive near-zero-depth checks, and every scale
 * change (up or down) shares the same rate limit so the pool cannot
 * oscillate faster than once per interval.
 */
export class QueueAutoscaler {
  private nearZeroChecks = 0;
  // Starts at -Infinity (not 0) so the very first evaluate() call is never
  // mistaken for "just scaled a moment ago" when now() also starts at 0.
  private lastScaleChangeAt = Number.NEGATIVE_INFINITY;
  private readonly now: () => number;

  constructor(
    private readonly minConcurrency: number,
    private readonly maxConcurrency: number,
    private readonly scaleIntervalMs = 30_000,
    private readonly scaleDownAfterNearZeroChecks = 5,
    now: () => number = Date.now,
  ) {
    if (minConcurrency < 1) throw new RangeError('minConcurrency must be >= 1');
    if (maxConcurrency < minConcurrency) throw new RangeError('maxConcurrency must be >= minConcurrency');
    this.now = now;
  }

  evaluate(currentConcurrency: number, currentDepth: number, previousDepth: number): ScalingDecision {
    const nowMs = this.now();
    const isNearZero = currentDepth <= 1;
    this.nearZeroChecks = isNearZero ? this.nearZeroChecks + 1 : 0;

    const rateLimited = nowMs - this.lastScaleChangeAt < this.scaleIntervalMs;

    if (!rateLimited && currentDepth > previousDepth && currentConcurrency < this.maxConcurrency) {
      this.lastScaleChangeAt = nowMs;
      return { action: 'scale-up', newConcurrency: currentConcurrency + 1 };
    }

    if (
      !rateLimited &&
      this.nearZeroChecks >= this.scaleDownAfterNearZeroChecks &&
      currentConcurrency > this.minConcurrency
    ) {
      this.lastScaleChangeAt = nowMs;
      this.nearZeroChecks = 0;
      return { action: 'scale-down', newConcurrency: currentConcurrency - 1 };
    }

    return { action: 'hold', newConcurrency: currentConcurrency };
  }
}
