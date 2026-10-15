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

/**
 * A boolean read from an environment string.
 *
 * `z.coerce.boolean()` is unsafe for env parsing: it is `Boolean(value)`, so the *string* `"false"`
 * coerces to `true` — an explicit `false` in the environment would be read as `true`. That silently
 * broke `BCCM_BATCH_PUSH_DRY_RUN` (the `.env.example` says "Set false to send", but `false` read as
 * `true`, so the batch push never actually ran) and would silently force `DATABASE_SSL` /
 * `REDIS_TLS` on. This accepts true/1/yes/on (case-insensitive) as `true`, any other non-empty
 * string as `false`, and falls back to `def` when unset or blank.
 */
const envBool = (def: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) =>
      value === undefined
        ? def
        : typeof value === 'boolean'
          ? value
          : value.trim() === ''
            ? def
            : /^(true|1|yes|on)$/i.test(value.trim()),
    );

const baseEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    // §8.4 — runtime role: 'main' opens the gateway + HTTP surfaces; 'worker' runs the truncated
    // bootstrap and must never hold a Discord client or an HTTP listener.
    ROLE: z.enum(['main', 'worker']).default('main'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    API_BIND_HOST: z.string().default('127.0.0.1'),
    API_PORT: z.coerce.number().int().positive().default(8080),
    HEALTH_BIND_HOST: z.string().default('127.0.0.1'),
    HEALTH_PORT: z.coerce.number().int().positive().default(8081),
    METRICS_BIND_HOST: z.string().default('127.0.0.1'),
    METRICS_PORT: z.coerce.number().int().positive().default(8082),
    POWER_ENGINE_BIND_HOST: z.string().default('127.0.0.1'),
    POWER_ENGINE_PORT: z.coerce.number().int().positive().default(8083),
    CLAI_BIND_HOST: z.string().default('127.0.0.1'),
    CLAI_PORT: z.coerce.number().int().positive().default(8084),
    // UR-C-06: CLAI session bounds.
    CLAI_MAX_SESSIONS: z.coerce.number().int().positive().default(5),
    CLAI_MAX_BYTES_PER_SESSION: z.coerce.number().int().positive().default(65_536),
    SWASTIK_BIND_HOST: z.string().default('127.0.0.1'),
    SWASTIK_PORT: z.coerce.number().int().positive().default(8085),
    CREDENTIALS_SERVICE_BIND_HOST: z.string().default('127.0.0.1'),
    CREDENTIALS_SERVICE_PORT: z.coerce.number().int().positive().default(8086),
    // Peer URL other surfaces call to reach the Credentials Service (§22.8 verification and
    // issuance are delegated there alone). Hostname of the container/host running it.
    CREDENTIALS_SERVICE_URL: z.string().url().default('http://127.0.0.1:8086'),
    CREDENTIALS_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
    TWILL_BIND_HOST: z.string().default('127.0.0.1'),
    TWILL_PORT: z.coerce.number().int().positive().default(8090),

    BOT_TOKEN: z.string().default(''),
    // §17.6 — a Bearer token (user OAuth2, scope `applications.commands.permissions.update`) used to
    // edit per-guild command permissions (Server Settings → Integrations). Discord REJECTS a bot
    // token on that endpoint (403 "Bots cannot use this endpoint"); a bot cannot mint this token
    // itself, so the operator provisions it. Without it, module disable still writes the state and
    // enqueues the BCCM deregistration, but the instant hide/restrict does not run.
    DISCORD_COMMAND_PERMISSIONS_TOKEN: z.string().default(''),
    PERSONA_ID: z.string().default(''),
    BOT_OWNER_IDS: csvIds(),
    DEV_GUILD_ID: z
      .string()
      .regex(/^\d{17,20}$/, 'DEV_GUILD_ID must be a 17-20 digit Discord snowflake'),
    DEVELOPMENT_GUILD_ID: z
      .string()
      .regex(/^\d{17,20}$/, 'DEVELOPMENT_GUILD_ID must be a 17-20 digit Discord snowflake')
      .optional(),
    DISCORD_ADAPTER: z.enum(['mock', 'live']).default('mock'),
    OAUTH_CLIENT_ID: z.string().default(''),
    OAUTH_CLIENT_SECRET: z.string().default(''),
    OAUTH_REDIRECT_URI: z.string().default(''),
    // UR-20261012-031 — the bot-install permission bitfield. Supplying it is what makes Discord show
    // its standard "what permissions should this bot have?" step on the install screen. The default
    // is the minimum a Components-V2 command bot needs: View Channels, Send Messages, Embed Links,
    // Read Message History.
    BOT_INSTALL_PERMISSIONS: z.string().default('84992'),
    // UR-20261012-034 — serve the Twill persona registration API on the ALREADY-DEPLOYED API server
    // as well as the dedicated Twill process, so it is usable without provisioning a new Railway
    // service. OFF by default: the endpoint accepts bot tokens and client secrets, so the public
    // surface must not grow unless the operator asks for it. It stays behind the internal API key.
    TWILL_ROUTES_ON_API: envBool(false),
    // UR-20261012-037 — the registrar registry's boot seed: comma-separated, each entry either a
    // bare authority (granted for ANY application) or `authority=applicationId`. Applied
    // idempotently at boot, so a fresh install is not chicken-and-egg.
    PERSONA_REGISTRAR_AUTHORITIES: z.string().default(''),
    // UR-20261012-038 — host every active persona's gateway, so a registered persona is actually
    // ONLINE in its bound guild. Off by default: it opens one gateway connection per persona.
    PERSONA_RUNTIME_ENABLED: envBool(false),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_REPLICA_URLS: csvIds(),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    DATABASE_REPLICA_MAX_LAG_MS: z.coerce.number().int().nonnegative().default(1000),
    DATABASE_SSL: envBool(false),
    SLOW_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(500),
    CRITICAL_QUERY_THRESHOLD_MS: z.coerce.number().int().positive().default(2000),

    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    REDIS_TLS: envBool(false),
    CACHE_L1_MAX_ENTRIES: z.coerce.number().int().positive().default(5000),
    CACHE_L1_MAX_BYTES: z.coerce.number().int().positive().default(52_428_800),

    QUEUE_REDIS_URL: z.string().min(1, 'QUEUE_REDIS_URL is required'),
    QUEUE_CONCURRENCY_DEFAULT: z.coerce.number().int().positive().default(5),

    RATE_LIMIT_USER_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_USER_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_GUILD_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_GUILD_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

    EVENT_BUS_MAX_EMIT_DEPTH: z.coerce.number().int().positive().default(20),
    EVENT_LOOP_LAG_SHED_THRESHOLD_MS: z.coerce.number().int().positive().default(50),

    SHARD_COUNT: z.coerce.number().int().positive().default(1),
    SHARD_RANGE: z.string().default('0-0'),
    SHARD_LOCK_HEARTBEAT_MS: z.coerce.number().int().positive().default(10_000),
    SHARD_LOCK_RETRY_MS: z.coerce.number().int().positive().default(2000),

    TELEMETRY_ENABLED: envBool(false),
    TRACE_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(''),

    INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 characters'),
    ENCRYPTION_ROOT_KEY: z
      .string()
      .min(1, 'ENCRYPTION_ROOT_KEY must be base64 of a 32-byte root key')
      .refine((value) => {
        try {
          return Buffer.from(value, 'base64').length === 32;
        } catch {
          return false;
        }
      }, 'ENCRYPTION_ROOT_KEY must decode to exactly 32 bytes'),
    POWER_ENGINE_TRUSTED_SOURCES: csvIds(),
    // §22.5: the independently-configured Power Engine operator allow-list — the identities that may
    // decide governance approvals. Distinct from (but typically overlapping) BOT_OWNER_IDS.
    POWER_ENGINE_OPERATOR_IDS: csvIds(),
    POWER_ENGINE_SERVICE_CREDENTIAL: z.string().default(''),
    CLAI_AUTHKEY_STORAGE_URL: z.string().default(''),

    MODULES_DIR: z.string().default('/mnt/modules'),
    // D-7.5.5 — the operator-authored security policy lockfile checked at Stage 11.
    SECURITY_POLICY_LOCKFILE: z.string().default('security-policy.lock.json'),
    // Appendix C #11 — the bundled OpenAPI contract, published at `/openapi.yaml`.
    OPENAPI_CONTRACT_PATH: z.string().default('docs/contracts/openapi.yaml'),
    // The flow suite pre-compiles migrations to JS and points these seams at the output.
    KNEX_MIGRATIONS_DIR: z.string().default(''),
    KNEX_MIGRATIONS_EXT: z.string().default(''),
    // Appendix C #18 — the operational runbooks directory surfaced by the operational tooling.
    OPERATIONAL_RUNBOOKS_DIR: z.string().default('apps/main/docs/runbooks'),
    SWASTIK_STAGING_VOLUME_PATH: z.string().default('/mnt/modules/swastik-staging'),
    SWASTIK_LIVE_VOLUME_PATH: z.string().default('/mnt/modules/modules-core'),
    // §15.8 build provenance: the in-process Ed25519 signer's key id and PKCS#8 private key. The
    // private key is never persisted; `signing_keys` holds only public keys (finding #21).
    BUILD_SIGNING_KEY_ID: z.string().default(''),
    BUILD_SIGNING_PRIVATE_KEY: z.string().default(''),
    // UR-20261012-036 — the PUBLIC half. The verifier needs only this, so the runtime never has to
    // hold the platform's signing secret. Preferred over the private key when both are set.
    BUILD_SIGNING_PUBLIC_KEY: z.string().default(''),
    // §15.9 quarantine root for refused modules. Empty => `<MODULES_DIR>/quarantine`.
    SWASTIK_QUARANTINE_PATH: z.string().default(''),

    MTP_BANDWIDTH_TOKEN_THRESHOLD_BYTES: z.coerce.number().int().positive().default(1_048_576),
    MTP_MEMORY_TOKEN_THRESHOLD_BYTES: z.coerce.number().int().positive().default(52_428_800),

    CORE_ADMIN_EVAL_ENABLED: envBool(false),
    // §17.7 BCCM — the batch push defaults to dry-run: it logs the batch it would send and
    // changes nothing until an operator turns this off.
    BCCM_BATCH_PUSH_DRY_RUN: envBool(true),
  })
  .strict();

export const envSchema = baseEnvSchema.refine(
  (env) => env.DISCORD_ADAPTER !== 'live' || env.BOT_TOKEN.length > 0,
  {
    message: 'BOT_TOKEN is required when DISCORD_ADAPTER=live',
    path: ['BOT_TOKEN'],
  },
);

type RawEnv = z.infer<typeof envSchema>;
export type Env = Omit<RawEnv, 'DEVELOPMENT_GUILD_ID'>;

export const ENV_KEYS: readonly string[] = Object.keys(baseEnvSchema.shape);

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
  const merged: NodeJS.ProcessEnv = { ...raw };
  if (!merged['DEV_GUILD_ID'] && merged['DEVELOPMENT_GUILD_ID']) {
    merged['DEV_GUILD_ID'] = merged['DEVELOPMENT_GUILD_ID'];
  }
  const result = envSchema.safeParse(merged);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '(root)';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ConfigValidationError(fieldErrors);
  }
  const { DEVELOPMENT_GUILD_ID: _developmentGuildId, ...env } = result.data;
  void _developmentGuildId;
  return env;
}
