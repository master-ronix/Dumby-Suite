import { test, expect } from 'vitest';
import { InFlightTracker } from '../../src/shutdown/in-flight-tracker.js';

test('waitForDrain resolves immediately when count is already zero', async () => {
  const tracker = new InFlightTracker();
  let slept = false;
  await tracker.waitForDrain(1000, async () => {
    slept = true;
  });
  expect(slept).toBe(false);
});

test('waitForDrain resolves as soon as the last in-flight request decrements to zero', async () => {
  const tracker = new InFlightTracker();
  tracker.increment();
  tracker.increment();
  expect(tracker.getCount()).toBe(2);

  const drainPromise = tracker.waitForDrain(5000, () => new Promise(() => {}));
  tracker.decrement();
  tracker.decrement();
  await drainPromise;
  expect(tracker.getCount()).toBe(0);
});

test('waitForDrain falls back to the timeout if requests never finish draining', async () => {
  const tracker = new InFlightTracker();
  tracker.increment();
  let timedOut = false;
  await tracker.waitForDrain(10, async () => {
    timedOut = true;
  });
  expect(timedOut).toBe(true);
});

test('decrement never goes below zero', () => {
  const tracker = new InFlightTracker();
  tracker.decrement();
  tracker.decrement();
  expect(tracker.getCount()).toBe(0);
});

test('multiple concurrent waitForDrain calls all resolve once drained', async () => {
  const tracker = new InFlightTracker();
  tracker.increment();
  const waiters = [
    tracker.waitForDrain(5000, () => new Promise(() => {})),
    tracker.waitForDrain(5000, () => new Promise(() => {})),
  ];
  tracker.decrement();
  await Promise.all(waiters);
});
