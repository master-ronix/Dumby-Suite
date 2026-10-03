import { test, expect } from 'vitest';
import { RetryPolicy, RetryExhaustedError } from '../../src/resilience/retry-policy.js';

test('delayForAttempt is capped at maxDelayMs and never negative', () => {
  const policy = new RetryPolicy({
    maxAttempts: 5,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    random: () => 1,
  });
  expect(policy.delayForAttempt(0)).toBe(100);
  expect(policy.delayForAttempt(1)).toBe(200);
  expect(policy.delayForAttempt(2)).toBe(400);
  expect(policy.delayForAttempt(10)).toBe(1000);
});

test('delayForAttempt scales down with the injected random source (full jitter)', () => {
  const policy = new RetryPolicy({
    maxAttempts: 5,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    random: () => 0.5,
  });
  expect(policy.delayForAttempt(0)).toBe(50);
});

test('execute() returns the result of the first successful attempt without extra retries', async () => {
  const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 });
  let calls = 0;
  const result = await policy.execute(
    async () => {
      calls += 1;
      return 'ok';
    },
    async () => {},
  );
  expect(result).toBe('ok');
  expect(calls).toBe(1);
});

test('execute() retries on failure up to maxAttempts then throws RetryExhaustedError', async () => {
  const policy = new RetryPolicy({ maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 });
  let calls = 0;
  await expect(() =>
    policy.execute(
      async () => {
        calls += 1;
        throw new Error(`fail ${calls}`);
      },
      async () => {},
    ),
  ).rejects.toThrow(RetryExhaustedError);
  expect(calls).toBe(3);
});

test('execute() succeeds on a later attempt after earlier failures', async () => {
  const policy = new RetryPolicy({ maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 1 });
  let calls = 0;
  const result = await policy.execute(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('not yet');
      return 'eventually';
    },
    async () => {},
  );
  expect(result).toBe('eventually');
  expect(calls).toBe(3);
});

test('RetryExhaustedError exposes the attempt count and last error', async () => {
  const policy = new RetryPolicy({ maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 });
  try {
    await policy.execute(
      async () => {
        throw new Error('root cause');
      },
      async () => {},
    );
    expect.fail('expected RetryExhaustedError');
  } catch (err) {
    expect(err).toBeInstanceOf(RetryExhaustedError);
    expect(err.attempts).toBe(2);
    expect((err.lastError as Error).message).toBe('root cause');
  }
});

test('constructor rejects maxAttempts < 1', () => {
  expect(() => new RetryPolicy({ maxAttempts: 0, baseDelayMs: 1, maxDelayMs: 1 })).toThrow(
    RangeError,
  );
});
