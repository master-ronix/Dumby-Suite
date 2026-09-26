import { test, expect } from 'vitest';
import { DlqMonitor, QueueAutoscaler } from '../../src/queue/autoscaler.js';

test('DlqMonitor does not alert at or below the default threshold of 10', () => {
  const monitor = new DlqMonitor();
  expect(monitor.evaluate('emails', 10).shouldAlert).toBe(false);
  expect(monitor.evaluate('emails', 0).shouldAlert).toBe(false);
});

test('DlqMonitor alerts once the failed count exceeds the threshold', () => {
  const monitor = new DlqMonitor();
  const result = monitor.evaluate('emails', 11);
  expect(result.shouldAlert).toBe(true);
  expect(result.queue).toBe('emails');
  expect(result.failedCountLastHour).toBe(11);
});

test('DlqMonitor respects a custom threshold', () => {
  const monitor = new DlqMonitor(3);
  expect(monitor.evaluate('q', 3).shouldAlert).toBe(false);
  expect(monitor.evaluate('q', 4).shouldAlert).toBe(true);
});

test('QueueAutoscaler scales up by one when depth is growing and not rate-limited', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(1, 10, 30_000, 5, () => now);
  const decision = scaler.evaluate(2, 20, 5);
  expect(decision).toStrictEqual({ action: 'scale-up', newConcurrency: 3 });
});

test('QueueAutoscaler will not scale up past maxConcurrency', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(1, 3, 30_000, 5, () => now);
  const decision = scaler.evaluate(3, 20, 5);
  expect(decision).toStrictEqual({ action: 'hold', newConcurrency: 3 });
});

test('QueueAutoscaler rate-limits scale-ups to once per interval', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(1, 10, 30_000, 5, () => now);
  const first = scaler.evaluate(2, 20, 5);
  expect(first.action).toBe('scale-up');
  now += 10_000;
  const second = scaler.evaluate(3, 40, 20);
  expect(second.action).toBe('hold');
});

test('QueueAutoscaler scales down by one after 5 consecutive near-zero-depth checks', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(1, 10, 30_000, 5, () => now);
  let lastDecision;
  for (let i = 0; i < 5; i += 1) {
    lastDecision = scaler.evaluate(5, 0, 0);
    now += 30_001;
  }
  expect(lastDecision).toStrictEqual({ action: 'scale-down', newConcurrency: 4 });
});

test('QueueAutoscaler resets the near-zero counter as soon as depth is no longer near zero', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(1, 10, 30_000, 3, () => now);
  scaler.evaluate(5, 0, 0);
  scaler.evaluate(5, 0, 0);
  scaler.evaluate(5, 50, 0);
  now += 30_001;
  const decision = scaler.evaluate(5, 0, 50);
  expect(decision.action).not.toBe('scale-down');
});

test('QueueAutoscaler will not scale down past minConcurrency', () => {
  let now = 0;
  const scaler = new QueueAutoscaler(5, 10, 30_000, 1, () => now);
  const decision = scaler.evaluate(5, 0, 0);
  expect(decision).toStrictEqual({ action: 'hold', newConcurrency: 5 });
});

test('constructor rejects an invalid concurrency range', () => {
  expect(() => new QueueAutoscaler(0, 10)).toThrow(RangeError);
  expect(() => new QueueAutoscaler(5, 2)).toThrow(RangeError);
});
