export class InFlightTracker {
  private count = 0;
  private resolvers: Array<() => void> = [];

  increment(): void {
    this.count += 1;
  }

  decrement(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      for (const resolve of this.resolvers.splice(0)) resolve();
    }
  }

  getCount(): number {
    return this.count;
  }

  async waitForDrain(
    timeoutMs: number,
    sleep: (ms: number) => Promise<void> = defaultSleep,
  ): Promise<void> {
    if (this.count === 0) return;
    await Promise.race([
      new Promise<void>((resolve) => this.resolvers.push(resolve)),
      sleep(timeoutMs),
    ]);
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
