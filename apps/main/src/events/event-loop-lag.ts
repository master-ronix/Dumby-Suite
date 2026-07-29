/**
 * Event-loop lag monitor (Cluster: Bags / Kelp).
 *
 * Measures how far a periodic tick drifts from its expected interval — the
 * standard proxy for event-loop lag. Timer + clock are injectable so the
 * threshold logic can be unit tested without waiting on real timers.
 */

export interface EventLoopLagMonitorOptions {
  thresholdMs?: number;
  intervalMs?: number;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
}

export class EventLoopLagMonitor {
  private readonly thresholdMs: number;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private readonly scheduleFn: (fn: () => void, ms: number) => unknown;
  private readonly cancelFn: (handle: unknown) => void;
  private handle: unknown = null;
  private lastLagMs = 0;
  private lastTick: number;

  constructor(options: EventLoopLagMonitorOptions = {}) {
    this.thresholdMs = options.thresholdMs ?? 50;
    this.intervalMs = options.intervalMs ?? 250;
    this.now = options.now ?? Date.now;
    this.scheduleFn = options.schedule ?? ((fn, ms) => setInterval(fn, ms));
    this.cancelFn = options.cancel ?? ((h) => clearInterval(h as NodeJS.Timeout));
    this.lastTick = this.now();
  }

  start(): void {
    this.lastTick = this.now();
    this.handle = this.scheduleFn(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.handle !== null) {
      this.cancelFn(this.handle);
      this.handle = null;
    }
  }

  private tick(): void {
    this.sample(this.now());
  }

  /** Exposed directly so tests can drive the monitor with synthetic timestamps. */
  sample(currentNow: number): number {
    const elapsed = currentNow - this.lastTick;
    this.lastLagMs = Math.max(0, elapsed - this.intervalMs);
    this.lastTick = currentNow;
    return this.lastLagMs;
  }

  getCurrentLagMs(): number {
    return this.lastLagMs;
  }

  isLagged(): boolean {
    return this.lastLagMs >= this.thresholdMs;
  }

  /** Should this particular emission be shed given current lag? Protected domains are never shed. */
  shouldShed(eventName: string, sheddable: boolean, isProtected: (name: string) => boolean): boolean {
    if (!sheddable) return false;
    if (isProtected(eventName)) return false;
    return this.isLagged();
  }
}
