import { Container, type Token } from './container.js';

export type RecordedCallType = 'log' | 'emit' | 'enqueue' | 'call' | 'set';

export interface RecordedCall {
  type: RecordedCallType;
  label: string;
  args: readonly unknown[];
  at: number;
}

export class AssertionFailedError extends Error {
  constructor(message: string, readonly recorded: readonly RecordedCall[]) {
    super(message);
    this.name = 'AssertionFailedError';
  }
}

/**
 * MockContainer (Cluster: Lens / Clay). Extends the real Container so
 * modules under test resolve real DI wiring, but every recordable side
 * effect (log lines, emitted events, enqueued jobs, cache sets, arbitrary
 * spy calls) is captured centrally and can be asserted on with a small,
 * consistent vocabulary instead of ad-hoc spies per test file.
 */
export class MockContainer extends Container {
  private readonly recorded: RecordedCall[] = [];

  record(type: RecordedCallType, label: string, args: readonly unknown[] = []): void {
    this.recorded.push({ type, label, args, at: Date.now() });
  }

  getRecorded(): readonly RecordedCall[] {
    return this.recorded;
  }

  reset(): void {
    this.recorded.length = 0;
  }

  private findAll(type: RecordedCallType, label: string): RecordedCall[] {
    return this.recorded.filter((c) => c.type === type && c.label === label);
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) throw new AssertionFailedError(message, this.recorded);
  }

  assertLogged(level: string, messageIncludes?: string): void {
    const matches = this.findAll('log', level).filter(
      (c) => messageIncludes === undefined || String(c.args[0] ?? '').includes(messageIncludes),
    );
    this.assert(
      matches.length > 0,
      `Expected a "${level}" log${messageIncludes ? ` containing "${messageIncludes}"` : ''}, but none was recorded.`,
    );
  }

  assertEmitted(eventName: string): void {
    this.assert(
      this.findAll('emit', eventName).length > 0,
      `Expected event "${eventName}" to have been emitted, but it was not.`,
    );
  }

  assertEnqueued(queueName: string): void {
    this.assert(
      this.findAll('enqueue', queueName).length > 0,
      `Expected a job on queue "${queueName}" to have been enqueued, but none was.`,
    );
  }

  assertCalled(label: string): void {
    this.assert(
      this.recorded.some((c) => c.type === 'call' && c.label === label),
      `Expected "${label}" to have been called, but it was not.`,
    );
  }

  assertNotCalled(label: string): void {
    this.assert(
      !this.recorded.some((c) => c.type === 'call' && c.label === label),
      `Expected "${label}" NOT to have been called, but it was.`,
    );
  }

  assertSet(key: string): void {
    this.assert(
      this.findAll('set', key).length > 0,
      `Expected key "${key}" to have been set, but it was not.`,
    );
  }

  /** Convenience: wraps any function so every invocation is recorded under `label`. */
  spy<Args extends unknown[], R>(label: string, fn: (...args: Args) => R): (...args: Args) => R {
    return (...args: Args): R => {
      this.record('call', label, args);
      return fn(...args);
    };
  }

  provideStub<T>(token: Token<T>, value: T): this {
    this.registerValue(token, value);
    return this;
  }
}
