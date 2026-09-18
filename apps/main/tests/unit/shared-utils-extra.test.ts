import { test, expect, describe, vi } from 'vitest';
import {
  generateToken,
  sha256,
  hmacSha256,
  constantTimeEqual,
} from '../../src/shared/utils/crypto.js';
import { createEmbed } from '../../src/shared/utils/embed.js';
import { paginate, buildPageButtons } from '../../src/shared/utils/paginator.js';
import { withRetry } from '../../src/shared/utils/retry.js';
import {
  snowflakeToTimestamp,
  snowflakeFromTimestamp,
  isSnowflake,
  shardIdFromSnowflake,
} from '../../src/shared/utils/snowflake.js';
import { COLORS, EMBED_COLORS } from '../../src/shared/constants/colors.js';
import { DURATIONS, BOOTSTRAP_TIMEOUTS } from '../../src/shared/constants/durations.js';
import { RATE_LIMIT_DEFAULTS } from '../../src/shared/constants/limits.js';

describe('generateToken', () => {
  test('produces a hex string of the requested byte length', () => {
    expect(generateToken(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(generateToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  test('produces distinct tokens on successive calls', () => {
    expect(generateToken(32)).not.toBe(generateToken(32));
  });
});

describe('sha256', () => {
  test('digests to the known sha-256 hex for the empty string', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('is deterministic', () => {
    expect(sha256('dumby')).toBe(sha256('dumby'));
  });
});

describe('hmacSha256', () => {
  test('is order-sensitive over key and data', () => {
    expect(hmacSha256('key', 'data')).not.toBe(hmacSha256('data', 'key'));
  });

  test('is deterministic', () => {
    expect(hmacSha256('k', 'd')).toBe(hmacSha256('k', 'd'));
  });
});

describe('constantTimeEqual', () => {
  test('returns true for identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  test('returns false for differing strings of equal length', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'xxc')).toBe(false);
  });

  test('short-circuits on length mismatch without comparing', () => {
    expect(constantTimeEqual('a', 'aa')).toBe(false);
    expect(constantTimeEqual('', 'a')).toBe(false);
  });
});

describe('createEmbed', () => {
  test('starts with defaults and builds a minimal embed', () => {
    const embed = createEmbed().setTitle('T').setDescription('D').build();
    expect(embed).toEqual({ title: 'T', description: 'D', color: 0x5865f2 });
  });

  test('chains fields, footer, and timestamp onto the payload', () => {
    const stamp = new Date('2026-01-01T00:00:00.000Z');
    const embed = createEmbed()
      .setTitle('T')
      .setDescription('D')
      .setColor(0x2ecc71)
      .addField('k', 'v', true)
      .setFooter('foot')
      .setTimestamp(stamp)
      .build();
    expect(embed.color).toBe(0x2ecc71);
    expect(embed.fields).toEqual([{ name: 'k', value: 'v', inline: true }]);
    expect(embed.footer).toEqual({ text: 'foot' });
    expect(embed.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  test('setTimestamp defaults to now when no date is passed', () => {
    const before = new Date(Date.now() - 1000).toISOString();
    const embed = createEmbed().setTitle('T').setDescription('D').setTimestamp().build();
    expect(embed.timestamp).toBeDefined();
    expect((embed.timestamp ?? '') >= before).toBe(true);
  });

  test('omits optional sections that were never set', () => {
    const embed = createEmbed().setTitle('T').setDescription('D').build();
    expect(embed.fields).toBeUndefined();
    expect(embed.footer).toBeUndefined();
    expect(embed.timestamp).toBeUndefined();
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 50 }, (_, i) => i);

  test('defaults to page 1, pageSize 25', () => {
    const result = paginate(items);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.items).toHaveLength(25);
    expect(result.totalPages).toBe(2);
    expect(result.total).toBe(50);
  });

  test('returns a requested page slice', () => {
    const result = paginate(items, { page: 2, pageSize: 20 });
    expect(result.items[0]).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.totalPages).toBe(3);
  });

  test('clamps page to a minimum of 1', () => {
    const result = paginate(items, { page: 0 });
    expect(result.page).toBe(1);
  });

  test('clamps pageSize to 1..100', () => {
    expect(paginate(items, { pageSize: 0 }).pageSize).toBe(1);
    expect(paginate(items, { pageSize: 500 }).pageSize).toBe(100);
  });

  test('handles an empty collection', () => {
    expect(paginate([]).totalPages).toBe(0);
    expect(paginate([]).items).toEqual([]);
  });
});

describe('buildPageButtons', () => {
  test('disables Previous on the first page', () => {
    const [prev, next] = buildPageButtons(1, 5);
    expect(prev).toMatchObject({ label: 'Previous', customId: 'page:0', disabled: true });
    expect(next).toMatchObject({ label: 'Next', customId: 'page:2', disabled: false });
  });

  test('disables Next on the last page', () => {
    const [prev, next] = buildPageButtons(5, 5);
    expect(prev.disabled).toBe(false);
    expect(next).toMatchObject({ customId: 'page:6', disabled: true });
  });
});

describe('withRetry', () => {
  test('returns the value on the first successful attempt', async () => {
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retries until success then returns', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');
    await expect(withRetry(fn, { baseDelayMs: 1, jitterFactor: 0 })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('gives up after maxAttempts and rethrows the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(
      withRetry(fn, { maxAttempts: 2, baseDelayMs: 1, jitterFactor: 0 }),
    ).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('respects retryOn to stop retrying for non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce('x');
    await expect(
      withRetry(fn, { maxAttempts: 5, baseDelayMs: 1, jitterFactor: 0, retryOn: () => false }),
    ).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('snowflake helpers', () => {
  const epoch = 1_420_070_400_000;
  const sample = snowflakeFromTimestamp(epoch);

  test('round-trips a timestamp through a snowflake', () => {
    expect(snowflakeToTimestamp(sample).getTime()).toBe(epoch);
  });

  test('snowflakeFromTimestamp encodes ms precision', () => {
    expect(snowflakeToTimestamp(snowflakeFromTimestamp(epoch + 1_000)).getTime()).toBe(
      epoch + 1_000,
    );
  });

  test('isSnowflake validates length only', () => {
    expect(isSnowflake('123456789012345678')).toBe(true);
    expect(isSnowflake('12345678901234567890')).toBe(true);
    expect(isSnowflake('12345')).toBe(false);
    expect(isSnowflake('abcdefghijklmnopqrs')).toBe(false);
  });

  test('shardIdFromSnowflake maps deterministic shards', () => {
    expect(shardIdFromSnowflake(sample, 1)).toBe(0);
    const shard = shardIdFromSnowflake(sample, 16);
    expect(shard).toBeGreaterThanOrEqual(0);
    expect(shard).toBeLessThan(16);
  });
});

describe('shared constants', () => {
  test('color and embed palettes are consistent', () => {
    expect(COLORS.GREEN).toBe(0x2ecc71);
    expect(EMBED_COLORS.SUCCESS).toBe(COLORS.GREEN);
    expect(EMBED_COLORS.ERROR).toBe(COLORS.RED);
    expect(EMBED_COLORS.ADMIN).toBe(COLORS.RED);
  });

  test('durations are internally consistent', () => {
    expect(DURATIONS.MILLISECONDS.SECOND).toBe(1000);
    expect(DURATIONS.MILLISECONDS.MINUTE).toBe(60 * 1000);
    expect(DURATIONS.MILLISECONDS.HOUR).toBe(3_600_000);
    expect(DURATIONS.MILLISECONDS.DAY).toBe(86_400_000);
  });

  test('rate limit defaults and shutdown ceilings are sane', () => {
    expect(RATE_LIMIT_DEFAULTS.USER_MAX).toBe(10);
    expect(BOOTSTRAP_TIMEOUTS.TERMINATION_GRACE_PERIOD).toBe(190_000);
    expect(BOOTSTRAP_TIMEOUTS.SHUTDOWN_TOTAL).toBe(180_000);
  });
});
