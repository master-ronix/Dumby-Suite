/**
 * Environment schema (Cluster: Bonds). Strict parsing: unknown keys are
 * rejected, every required key must be present, and every failure is
 * reported as a field-level error rather than a single opaque message.
 *
 * NOTE ON SANDBOX EXECUTION: this file imports 'zod'. In an environment
 * with `pnpm install` run (real Docker Compose target), it works exactly
 * as written. It cannot be executed inside the constrained review sandbox
 * used to build this repository, which has no package-registry access —
 * see STATUS_AND_VERIFICATION.md.
 */
import { z } from 'zod';

const csvIds = () =>
  z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    );

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    API_PORT: z.coerce.number().int().positive().default(8080),
    HEALTH_PORT: z.coerce.number().int().positive().default(8081),
    METRICS_PORT: z.coerce.number().int().positive().default(8082),
    PEP_PORT: z.coerce.number().int().positive().default(8083),
    CLAI_PORT: z.coerce.number().int().positive().default(8084),
    SWASTIK_PORT: z.coerce.number().int().positive().default(8085),
    CREDENTIALS_SERVICE_BIND_HOST: z.string().default('127.0.0.1'),

    BOT_TOKEN: z.string().default(''),
    BOT_OWNER_IDS: csvIds(),
    DEVELOPMENT_GUILD_ID: z.string().default(''),
    DISCORD_ADAPTER: z.enum(['mock', 'live']).default('mock'),
    OAUTH_CLIENT_ID: z.string().default(''),
    OAUTH_CLIENT_SECRET: z.string().default(''),
    OAUTH_REDIRECT_URI: z.string().default(''),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_READ_REPLICA_URLS: csvIds(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_STATEMENT_TIMEOUT: z.coerce.number().int().positive().default(15_000),
    DATABASE_REPLICA_MAX_LAG_MS: z.coerce.number().int().nonnegative().default(2000),
    SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(200),
    CRITICAL_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(1000),

    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    CACHE_L1_MAX_ENTRIES: z.coerce.number().int().positive().default(5000),
    CACHE_L1_MAX_BYTES: z.coerce.number().int().positive().default(52_428_800),

    QUEUE_REDIS_URL: z.string().min(1, 'QUEUE_REDIS_URL is required'),
    QUEUE_CONCURRENCY_DEFAULT: z.coerce.number().int().positive().default(5),

    RATE_LIMIT_USER_MAX: z.coerce.number().int().positive().default(5),
    RATE_LIMIT_USER_WINDOW_MS: z.coerce.number().int().positive().default(10_000),
    RATE_LIMIT_GUILD_MAX: z.coerce.number().int().positive().default(50),
    RATE_LIMIT_GUILD_WINDOW_MS: z.coerce.number().int().positive().default(10_000),

    EVENT_BUS_MAX_EMIT_DEPTH: z.coerce.number().int().positive().default(20),
    EVENT_LOOP_LAG_SHED_THRESHOLD_MS: z.coerce.number().int().positive().default(50),

    SHARD_COUNT: z.coerce.number().int().positive().default(1),
    SHARD_RANGE: z.string().default('0-0'),
    SHARD_LOCK_HEARTBEAT_MS: z.coerce.number().int().positive().default(5000),
    SHARD_LOCK_RETRY_MS: z.coerce.number().int().positive().default(2000),

    TELEMETRY_ENABLED: z.coerce.boolean().default(false),
    TRACE_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.05),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(''),

    INTERNAL_API_KEY: z.string().min(8, 'INTERNAL_API_KEY must be at least 8 characters'),
    JWT_SIGNING_KEY: z.string().min(16, 'JWT_SIGNING_KEY must be at least 16 characters'),
    ENCRYPTION_KEY_CURRENT: z.string().min(16, 'ENCRYPTION_KEY_CURRENT must be at least 16 characters'),
    ENCRYPTION_KEY_PREVIOUS: z.string().default(''),
    PEP_TRUSTED_SOURCES: csvIds(),
    CLAI_MFA_ISSUER: z.string().default('DUMBY-CLAI'),
    CLAI_AUTHKEY_STORAGE_URL: z.string().default(''),
    CLAI_BREAK_GLASS_SCRIPT_URL: z.string().default(''),

    SWASTIK_STAGING_VOLUME_PATH: z.string().default('/var/dumby/swastik-staging'),

    MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES: z.coerce.number().int().positive().default(1_048_576),
    MTP_MEMORY_TOKEN_THRESHOLD_BYTES: z.coerce.number().int().positive().default(52_428_800),

    CORE_ADMIN_EVAL_ENABLED: z.coerce.boolean().default(false),
  })
  .strict();

export const envSchema = baseEnvSchema.refine(
  (env) => env.DISCORD_ADAPTER !== 'live' || env.BOT_TOKEN.length > 0,
  {
    message: 'BOT_TOKEN is required when DISCORD_ADAPTER=live',
    path: ['BOT_TOKEN'],
  },
);

export type Env = z.infer<typeof envSchema>;

/** Every key this schema declares — the app's actual config surface. */
export const ENV_KEYS: readonly string[] = Object.keys(baseEnvSchema.shape);

/**
 * A real process.env always carries hundreds of OS/shell/tooling keys
 * (PATH, HOME, NIX_*, npm_*, REPLIT_*, ...) that were never part of this
 * app's config and were never meant to be. envSchema.strict() correctly
 * rejects genuinely-unexpected keys in a curated config object (see
 * env-schema.test.ts), but calling parseEnv(process.env) directly would
 * reject on that OS noise too. Pick only the declared keys first, then
 * validate — this preserves .strict()'s typo protection for the app's own
 * keys without requiring process.env to be an exact, closed set.
 */
export function pickEnvKeys(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const picked: NodeJS.ProcessEnv = {};
  for (const key of ENV_KEYS) {
    if (raw[key] !== undefined) picked[key] = raw[key];
  }
  return picked;
}

export class ConfigValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string[]>) {
    super(`Environment validation failed: ${Object.keys(fieldErrors).join(', ')}`);
    this.name = 'ConfigValidationError';
  }
}

export function parseEnv(raw: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '(root)';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ConfigValidationError(fieldErrors);
  }
  return result.data;
}
