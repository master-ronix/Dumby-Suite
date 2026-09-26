import { test, expect, describe } from 'vitest';
import { parseEnv, ConfigValidationError } from '../../src/config/env.schema.js';

const minValid = {
  DATABASE_URL: 'postgres://localhost/dumby_test',
  REDIS_URL: 'redis://localhost:6379/0',
  QUEUE_REDIS_URL: 'redis://localhost:6379/1',
  INTERNAL_API_KEY: 'supersecretkey_supersecretkey_32',
  ENCRYPTION_ROOT_KEY: 'JF8PejG/00/nD5iuxpUtzGqh5MWW3yL1Oj6EcWYPgzM=',
  DEV_GUILD_ID: '900000000000000001',
};

describe('parseEnv', () => {
  test('accepts a minimal valid environment', () => {
    const env = parseEnv(minValid);
    expect(env.DATABASE_URL).toBe('postgres://localhost/dumby_test');
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.API_PORT).toBe(8080);
    expect(env.HEALTH_PORT).toBe(8081);
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.CREDENTIALS_SERVICE_PORT).toBe(8086);
  });

  test('coerces numeric strings correctly', () => {
    const env = parseEnv({ ...minValid, API_PORT: '9000', DATABASE_POOL_MAX: '20' });
    expect(env.API_PORT).toBe(9000);
    expect(env.DATABASE_POOL_MAX).toBe(20);
  });

  test('parses BOT_OWNER_IDS as an array from CSV', () => {
    const env = parseEnv({ ...minValid, BOT_OWNER_IDS: '100,200,300' });
    expect(env.BOT_OWNER_IDS).toStrictEqual(['100', '200', '300']);
  });

  test('maps documented DEVELOPMENT_GUILD_ID alias to canonical DEV_GUILD_ID', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { DEV_GUILD_ID: _, ...base } = minValid;
    const env = parseEnv({ ...base, DEVELOPMENT_GUILD_ID: '123456789012345678' });
    expect(env.DEV_GUILD_ID).toBe('123456789012345678');
    expect(env).not.toHaveProperty('DEVELOPMENT_GUILD_ID');
  });

  test('prefers canonical DEV_GUILD_ID when both guild-id keys are present', () => {
    const env = parseEnv({
      ...minValid,
      DEV_GUILD_ID: '900000000000000001',
      DEVELOPMENT_GUILD_ID: '123456789012345678',
    });
    expect(env.DEV_GUILD_ID).toBe('900000000000000001');
  });

  test('DEV_GUILD_ID is required and must be a snowflake (UR-B-17)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { DEV_GUILD_ID: _, ...rest } = minValid;
    expect(() => parseEnv(rest)).toThrow(ConfigValidationError);
    expect(() => parseEnv({ ...minValid, DEV_GUILD_ID: 'guild-123' })).toThrow(
      ConfigValidationError,
    );
    expect(() => parseEnv({ ...minValid, DEV_GUILD_ID: '123' })).toThrow(ConfigValidationError);
  });

  test('coerces CREDENTIALS_SERVICE_PORT from string (UR-A-26/UR-C-27)', () => {
    const env = parseEnv({ ...minValid, CREDENTIALS_SERVICE_PORT: '9001' });
    expect(env.CREDENTIALS_SERVICE_PORT).toBe(9001);
  });

  test('returns empty array for empty BOT_OWNER_IDS', () => {
    const env = parseEnv({ ...minValid, BOT_OWNER_IDS: '' });
    expect(env.BOT_OWNER_IDS).toStrictEqual([]);
  });

  test('throws ConfigValidationError when DATABASE_URL is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { DATABASE_URL: _, ...rest } = minValid;
    expect(() => parseEnv(rest)).toThrow(ConfigValidationError);
  });

  test('throws ConfigValidationError when REDIS_URL is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { REDIS_URL: _, ...rest } = minValid;
    expect(() => parseEnv(rest)).toThrow(ConfigValidationError);
  });

  test('throws ConfigValidationError when INTERNAL_API_KEY is too short', () => {
    expect(() => parseEnv({ ...minValid, INTERNAL_API_KEY: 'short' })).toThrow(
      ConfigValidationError,
    );
  });

  test('ConfigValidationError.fieldErrors lists the failing field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { DATABASE_URL: _, ...rest } = minValid;
    try {
      parseEnv(rest);
      expect.fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const e = err as ConfigValidationError;
      expect(Object.keys(e.fieldErrors)).toContain('DATABASE_URL');
    }
  });

  test('DISCORD_ADAPTER defaults to mock', () => {
    const env = parseEnv(minValid);
    expect(env.DISCORD_ADAPTER).toBe('mock');
  });

  test('TELEMETRY_ENABLED coerces boolean false by default', () => {
    const env = parseEnv(minValid);
    expect(env.TELEMETRY_ENABLED).toBe(false);
  });

  test('coerces TELEMETRY_ENABLED string true', () => {
    const env = parseEnv({ ...minValid, TELEMETRY_ENABLED: 'true' });
    expect(env.TELEMETRY_ENABLED).toBe(true);
  });

  test('rejects unknown keys via .strict()', () => {
    expect(() => parseEnv({ ...minValid, UNKNOWN_EXTRA_KEY: 'bad' })).toThrow(
      ConfigValidationError,
    );
  });

  test('accepts NODE_ENV production', () => {
    const env = parseEnv({ ...minValid, NODE_ENV: 'production' });
    expect(env.NODE_ENV).toBe('production');
  });

  test('accepts NODE_ENV staging', () => {
    const env = parseEnv({ ...minValid, NODE_ENV: 'staging' });
    expect(env.NODE_ENV).toBe('staging');
  });

  test('uses Appendix A defaults for timing and rate limits', () => {
    const env = parseEnv(minValid);
    expect(env.DATABASE_STATEMENT_TIMEOUT_MS).toBe(10_000);
    expect(env.DATABASE_REPLICA_MAX_LAG_MS).toBe(1000);
    expect(env.SLOW_QUERY_THRESHOLD_MS).toBe(500);
    expect(env.CRITICAL_QUERY_THRESHOLD_MS).toBe(2000);
    expect(env.RATE_LIMIT_USER_WINDOW_MS).toBe(60_000);
    expect(env.RATE_LIMIT_USER_MAX).toBe(10);
    expect(env.RATE_LIMIT_GUILD_WINDOW_MS).toBe(60_000);
    expect(env.RATE_LIMIT_GUILD_MAX).toBe(100);
    expect(env.TRACE_SAMPLE_RATE).toBe(0.1);
    expect(env.SHARD_LOCK_HEARTBEAT_MS).toBe(10_000);
  });
});
