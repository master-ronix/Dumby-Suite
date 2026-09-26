import { test, expect } from 'vitest';
import { ConfigService } from '../../src/config/config.service.js';
import type { Env } from '../../src/config/env.schema.js';

function fakeEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    API_PORT: 8080,
    HEALTH_PORT: 8081,
    METRICS_PORT: 8082,
    PEP_PORT: 8083,
    CLAI_PORT: 8084,
    SWASTIK_PORT: 8085,
    CREDENTIALS_SERVICE_BIND_HOST: '127.0.0.1',
    BOT_TOKEN: 'secret-token',
    BOT_OWNER_IDS: ['1'],
    DEV_GUILD_ID: '',
    DISCORD_ADAPTER: 'mock',
    OAUTH_CLIENT_ID: '',
    OAUTH_CLIENT_SECRET: 'oauth-secret',
    OAUTH_REDIRECT_URI: '',
    DATABASE_URL: 'postgres://user:pass@host:5432/db',
    DATABASE_REPLICA_URLS: [],
    DATABASE_POOL_MAX: 10,
    DATABASE_STATEMENT_TIMEOUT_MS: 10000,
    DATABASE_REPLICA_MAX_LAG_MS: 1000,
    SLOW_QUERY_THRESHOLD_MS: 500,
    CRITICAL_QUERY_THRESHOLD_MS: 2000,
    REDIS_URL: 'redis://host:6379/0',
    CACHE_L1_MAX_ENTRIES: 5000,
    CACHE_L1_MAX_BYTES: 52428800,
    QUEUE_REDIS_URL: 'redis://host:6379/1',
    QUEUE_CONCURRENCY_DEFAULT: 5,
    RATE_LIMIT_USER_MAX: 10,
    RATE_LIMIT_USER_WINDOW_MS: 60000,
    RATE_LIMIT_GUILD_MAX: 100,
    RATE_LIMIT_GUILD_WINDOW_MS: 60000,
    EVENT_BUS_MAX_EMIT_DEPTH: 20,
    EVENT_LOOP_LAG_SHED_THRESHOLD_MS: 50,
    SHARD_COUNT: 1,
    SHARD_RANGE: '0-0',
    SHARD_LOCK_HEARTBEAT_MS: 10000,
    SHARD_LOCK_RETRY_MS: 2000,
    TELEMETRY_ENABLED: false,
    TRACE_SAMPLE_RATE: 0.1,
    OTEL_EXPORTER_OTLP_ENDPOINT: '',
    INTERNAL_API_KEY: 'internal-key-internal-key-32chars',
    ENCRYPTION_ROOT_KEY: 'JF8PejG/00/nD5iuxpUtzGqh5MWW3yL1Oj6EcWYPgzM=',
    PEP_TRUSTED_SOURCES: ['dashboard'],
    CLAI_MFA_ISSUER: 'DUMBY-CLAI',
    CLAI_AUTHKEY_STORAGE_URL: '',
    CLAI_BREAK_GLASS_SCRIPT_URL: '',
    MODULES_DIR: '/var/dumby/modules',
    SWASTIK_STAGING_VOLUME_PATH: '/var/dumby/swastik-staging',
    SWASTIK_LIVE_VOLUME_PATH: '/var/dumby/swastik-live',
    MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES: 1048576,
    MTP_MEMORY_TOKEN_THRESHOLD_BYTES: 52428800,
    CORE_ADMIN_EVAL_ENABLED: false,
    ...overrides,
  };
}

test('get() returns the underlying typed value', () => {
  const config = new ConfigService(fakeEnv({ API_PORT: 9999 }));
  expect(config.get('API_PORT')).toBe(9999);
});

test('isProduction / isDevelopment / isTest reflect NODE_ENV', () => {
  expect(new ConfigService(fakeEnv({ NODE_ENV: 'production' })).isProduction()).toBe(true);
  expect(new ConfigService(fakeEnv({ NODE_ENV: 'staging' })).isStaging()).toBe(true);
  expect(new ConfigService(fakeEnv({ NODE_ENV: 'development' })).isDevelopment()).toBe(true);
  expect(new ConfigService(fakeEnv({ NODE_ENV: 'test' })).isTest()).toBe(true);
  expect(new ConfigService(fakeEnv({ NODE_ENV: 'production' })).isDevelopment()).toBe(false);
});

test('snapshot() returns a frozen copy that cannot be mutated', () => {
  const config = new ConfigService(fakeEnv());
  const snap = config.snapshot();
  expect(Object.isFrozen(snap)).toBe(true);
});

test('redactedSnapshot() masks every known secret key', () => {
  const config = new ConfigService(fakeEnv());
  const redacted = config.redactedSnapshot();
  expect(redacted.BOT_TOKEN).toBe('[REDACTED]');
  expect(redacted.DATABASE_URL).toBe('[REDACTED]');
  expect(redacted.INTERNAL_API_KEY).toBe('[REDACTED]');
  expect(redacted.ENCRYPTION_ROOT_KEY).toBe('[REDACTED]');
});

test('redactedSnapshot() leaves non-secret values untouched', () => {
  const config = new ConfigService(fakeEnv({ API_PORT: 8080, NODE_ENV: 'development' }));
  const redacted = config.redactedSnapshot();
  expect(redacted.API_PORT).toBe(8080);
  expect(redacted.NODE_ENV).toBe('development');
});
