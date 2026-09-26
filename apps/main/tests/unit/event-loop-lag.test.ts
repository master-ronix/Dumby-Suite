import { test, expect } from 'vitest';
import { EventLoopLagMonitor } from '../../src/events/event-loop-lag.js';

test('reports zero lag when ticks land exactly on schedule', () => {
  const monitor = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 250, now: () => 0 });
  const lag = monitor.sample(250);
  expect(lag).toBe(0);
  expect(monitor.isLagged()).toBe(false);
});

test('reports the overshoot as lag when a tick arrives late', () => {
  const monitor = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 250, now: () => 0 });
  const lag = monitor.sample(400);
  expect(lag).toBe(150);
  expect(monitor.isLagged()).toBe(true);
});

test('isLagged default threshold matches EVENT_LOOP_LAG_SHED_THRESHOLD_MS=50', () => {
  const monitor = new EventLoopLagMonitor({ intervalMs: 100, now: () => 0 });
  monitor.sample(149);
  expect(monitor.isLagged()).toBe(false);
  monitor.sample(249 + 50);
  expect(monitor.isLagged()).toBe(true);
});

test('shouldShed only sheds sheddable, non-protected events while lagged', () => {
  const monitor = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 100, now: () => 0 });
  monitor.sample(300);
  const isProtected = (name: string) => name.startsWith('moderation.');

  expect(monitor.shouldShed('presence.user.updated', true, isProtected)).toBe(true);
  expect(monitor.shouldShed('presence.user.updated', false, isProtected)).toBe(false);
  expect(monitor.shouldShed('moderation.case.created', true, isProtected)).toBe(false);
});

test('shouldShed never sheds while lag is below threshold', () => {
  const monitor = new EventLoopLagMonitor({ thresholdMs: 50, intervalMs: 100, now: () => 0 });
  monitor.sample(110);
  const isProtected = () => false;
  expect(monitor.shouldShed('presence.user.updated', true, isProtected)).toBe(false);
});

test('start()/stop() wire through the injected schedule/cancel functions', () => {
  let scheduledFn: (() => void) | null = null;
  let scheduledMs: number | null = null;
  let cancelled = false;
  const monitor = new EventLoopLagMonitor({
    intervalMs: 250,
    now: () => 0,
    schedule: (fn, ms) => {
      scheduledFn = fn;
      scheduledMs = ms;
      return 'handle-token';
    },
    cancel: (handle) => {
      expect(handle).toBe('handle-token');
      cancelled = true;
    },
  });
  monitor.start();
  expect(scheduledMs).toBe(250);
  expect(typeof scheduledFn).toBe('function');
  monitor.stop();
  expect(cancelled).toBe(true);
});
