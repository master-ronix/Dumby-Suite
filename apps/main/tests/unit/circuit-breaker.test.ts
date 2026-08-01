import { test, expect } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../../src/resilience/circuit-breaker.js';

function fakeClock(startAt = 0) {
  let now = startAt;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

test('starts CLOSED and stays CLOSED below the failure threshold', () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000, now: clock.now });
  cb.onFailure();
  cb.onFailure();
  expect(cb.getState()).toBe('CLOSED');
});

test('trips to OPEN once the failure threshold is reached', () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000, now: clock.now });
  cb.onFailure();
  cb.onFailure();
  cb.onFailure();
  expect(cb.getState()).toBe('OPEN');
  expect(() => cb.beforeCall()).toThrow(CircuitOpenError);
});

test('moves OPEN -> HALF_OPEN after resetTimeoutMs elapses', () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 500, now: clock.now });
  cb.onFailure();
  expect(cb.getState()).toBe('OPEN');
  clock.advance(499);
  expect(cb.getState()).toBe('OPEN');
  clock.advance(1);
  expect(cb.getState()).toBe('HALF_OPEN');
});

test('HALF_OPEN -> CLOSED on a successful trial call', () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, now: clock.now });
  cb.onFailure();
  clock.advance(100);
  expect(cb.getState()).toBe('HALF_OPEN');
  cb.beforeCall();
  cb.onSuccess();
  expect(cb.getState()).toBe('CLOSED');
});

test('HALF_OPEN -> OPEN again on a failed trial call, restarting the reset window', () => {
  const clock = fakeClock();
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, now: clock.now });
  cb.onFailure();
  clock.advance(100);
  expect(cb.getState()).toBe('HALF_OPEN');
  cb.beforeCall();
  cb.onFailure();
  expect(cb.getState()).toBe('OPEN');
});

test('execute() resolves normally and records success for a passing call', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  const result = await cb.execute(async () => 42);
  expect(result).toBe(42);
  expect(cb.getState()).toBe('CLOSED');
});

test('execute() propagates the underlying error and still counts the failure', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 1000 });
  await expect(() =>
    cb.execute(async () => {
      throw new Error('downstream failure');
    }),
  ).rejects.toThrow(/downstream failure/);
  expect(cb.getState()).toBe('OPEN');
});

test('constructor rejects an invalid failureThreshold', () => {
  expect(() => new CircuitBreaker({ failureThreshold: 0, resetTimeoutMs: 10 })).toThrow(RangeError);
});
