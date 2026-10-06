/**
 * ACC-ARCH-0008-6 — `ITimerService` owns every timer a module or the framework registers, so a
 * module unload clears all of its timers automatically (no zombie timers survive an unload).
 */
export interface ITimerService {
  setTimeout(fn: () => void, ms: number): NodeJS.Timeout;
  setInterval(fn: () => void, ms: number): NodeJS.Timeout;
  clear(handle: NodeJS.Timeout): void;
  clearAll(): void;
  activeCount(): number;
}

export class TimerService implements ITimerService {
  private readonly timers = new Set<NodeJS.Timeout>();

  setTimeout(fn: () => void, ms: number): NodeJS.Timeout {
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      fn();
    }, ms);
    this.timers.add(handle);
    return handle;
  }

  setInterval(fn: () => void, ms: number): NodeJS.Timeout {
    const handle = setInterval(fn, ms);
    this.timers.add(handle);
    return handle;
  }

  clear(handle: NodeJS.Timeout): void {
    clearTimeout(handle);
    clearInterval(handle);
    this.timers.delete(handle);
  }

  clearAll(): void {
    for (const handle of this.timers) {
      clearTimeout(handle);
      clearInterval(handle);
    }
    this.timers.clear();
  }

  activeCount(): number {
    return this.timers.size;
  }
}
