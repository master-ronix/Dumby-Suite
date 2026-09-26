import { test, expect } from 'vitest';
import {
  SlidingWindowRateLimiter,
  FallbackRateLimiter,
} from '../../src/ratelimit/sliding-window.js';

test('allows up to maxHits requests within the window', () => {
  let now = 0;
  const limiter = new SlidingWindowRateLimiter(5, 10_000, () => now);
  for (let i = 0; i < 5; i += 1) {
    const decision = limiter.checkAndIncrement('user-1');
    expect(decision.allowed).toBe(true);
  }
});

test('the 6th request within the window is rejected with a retryAfterMs', () => {
  let now = 0;
  const limiter = new SlidingWindowRateLimiter(5, 10_000, () => now);
  for (let i = 0; i < 5; i += 1) limiter.checkAndIncrement('user-1');
  const sixth = limiter.checkAndIncrement('user-1');
  expect(sixth.allowed).toBe(false);
  expect(sixth.retryAfterMs > 0).toBeTruthy();
});

test('a rejected attempt does not count toward the window (no increment after rejection)', () => {
  let now = 0;
  const limiter = new SlidingWindowRateLimiter(2, 10_000, () => now);
  limiter.checkAndIncrement('user-1');
  limiter.checkAndIncrement('user-1');
  limiter.checkAndIncrement('user-1');
  limiter.checkAndIncrement('user-1');
  now += 10_001;
  const afterWindow = limiter.checkAndIncrement('user-1');
  expect(afterWindow.allowed).toBe(true);
});

test('requests become allowed again once old hits slide out of the window', () => {
  let now = 0;
  const limiter = new SlidingWindowRateLimiter(1, 1000, () => now);
  expect(limiter.checkAndIncrement('user-1').allowed).toBe(true);
  expect(limiter.checkAndIncrement('user-1').allowed).toBe(false);
  now += 1001;
  expect(limiter.checkAndIncrement('user-1').allowed).toBe(true);
});

test('different keys (users/guilds) are tracked independently', () => {
  let now = 0;
  const limiter = new SlidingWindowRateLimiter(1, 10_000, () => now);
  expect(limiter.checkAndIncrement('user-1').allowed).toBe(true);
  expect(limiter.checkAndIncrement('user-2').allowed).toBe(true);
});

test('constructor rejects invalid maxHits/windowMs', () => {
  expect(() => new SlidingWindowRateLimiter(0, 1000)).toThrow(RangeError);
  expect(() => new SlidingWindowRateLimiter(1, 0)).toThrow(RangeError);
});

test('FallbackRateLimiter uses the primary limiter when it is healthy', async () => {
  const primary = {
    checkAndIncrement: async () => ({ allowed: true, remaining: 4, retryAfterMs: 0 }),
  };
  const fallback = new SlidingWindowRateLimiter(5, 10_000);
  let engaged = false;
  const wrapper = new FallbackRateLimiter(primary, fallback, () => (engaged = true));
  const result = await wrapper.checkAndIncrement('user-1');
  expect(result.allowed).toBe(true);
  expect(engaged).toBe(false);
  expect(wrapper.isUsingFallback()).toBe(false);
});

test('FallbackRateLimiter switches to the in-memory limiter when the primary throws, and fires onFallbackEngaged once', async () => {
  const primary = {
    checkAndIncrement: async () => {
      throw new Error('ECONNREFUSED');
    },
  };
  const fallback = new SlidingWindowRateLimiter(2, 10_000);
  let engagedCount = 0;
  const wrapper = new FallbackRateLimiter(primary, fallback, () => (engagedCount += 1));

  const first = await wrapper.checkAndIncrement('user-1');
  const second = await wrapper.checkAndIncrement('user-1');
  const third = await wrapper.checkAndIncrement('user-1');

  expect(first.allowed).toBe(true);
  expect(second.allowed).toBe(true);
  expect(third.allowed).toBe(false);
  expect(engagedCount).toBe(1);
  expect(wrapper.isUsingFallback()).toBe(true);
});

test('FallbackRateLimiter reports recovery once the primary succeeds again', async () => {
  let shouldFail = true;
  const primary = {
    checkAndIncrement: async () => {
      if (shouldFail) throw new Error('down');
      return { allowed: true, remaining: 1, retryAfterMs: 0 };
    },
  };
  const fallback = new SlidingWindowRateLimiter(5, 10_000);
  let recovered = false;
  const wrapper = new FallbackRateLimiter(
    primary,
    fallback,
    () => {},
    () => (recovered = true),
  );

  await wrapper.checkAndIncrement('user-1');
  expect(wrapper.isUsingFallback()).toBe(true);
  shouldFail = false;
  await wrapper.checkAndIncrement('user-1');
  expect(wrapper.isUsingFallback()).toBe(false);
  expect(recovered).toBe(true);
});
