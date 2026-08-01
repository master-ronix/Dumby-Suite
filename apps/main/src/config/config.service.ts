import type { Env } from './env.schema.js';

/**
 * Thin, typed accessor over the validated environment. Registered as
 * CORE_TOKENS.Config; nothing outside this file and env.schema.ts should
 * touch process.env directly (Cluster: Bonds — process.env discipline).
 */
export class ConfigService {
  constructor(private readonly env: Env) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }

  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  isStaging(): boolean {
    return this.env.NODE_ENV === 'staging';
  }

  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  snapshot(): Readonly<Env> {
    return Object.freeze({ ...this.env });
  }

  /** Redacted snapshot safe to return from GET /admin/config. */
  redactedSnapshot(): Record<string, unknown> {
    const secretKeys = new Set([
      'BOT_TOKEN',
      'OAUTH_CLIENT_SECRET',
      'INTERNAL_API_KEY',
      'JWT_SIGNING_KEY',
      'ENCRYPTION_KEY_CURRENT',
      'ENCRYPTION_KEY_PREVIOUS',
      'DATABASE_URL',
      'REDIS_URL',
      'QUEUE_REDIS_URL',
      'CLAI_AUTHKEY_STORAGE_URL',
    ]);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.env)) {
      out[key] = secretKeys.has(key) ? '[REDACTED]' : value;
    }
    return out;
  }
}
