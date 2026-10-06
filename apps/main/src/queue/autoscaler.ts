export interface DlqCheckResult {
  queue: string;
  failedCountLastHour: number;
  shouldAlert: boolean;
}

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

export class QueueAutoscaler {
  private nearZeroChecks = 0;
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
    if (maxConcurrency < minConcurrency)
      throw new RangeError('maxConcurrency must be >= minConcurrency');
    this.now = now;
  }

  evaluate(
    currentConcurrency: number,
    currentDepth: number,
    previousDepth: number,
  ): ScalingDecision {
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
