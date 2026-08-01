/**
 * Cache key namespace helpers.
 *
 * Blueprint §25: key convention `{domain}:{entity}:{identifier}[:{sub-scope}]`
 * Every family has a documented TTL; unknown families fall back to the default.
 *
 * Probabilistic early-recompute formula (PER): a key should be proactively
 * refreshed before it expires based on:
 *
 *   P(recompute) = exp(computeDurationMs / remainingTtlMs * ln(random))
 *
 * Which simplifies, per blueprint §25, to: trigger when
 *   -computeDurationMs * β * ln(random) >= remainingTtlMs
 * where β is a configurable amplification factor (default 1).
 *
 * We treat a remainingTtlMs of ≤ 0 as "always recompute" and a
 * computeDurationMs of 0 as "never trigger early" (nothing to amortize).
 */

// ── Key-family TTL registry (seconds) ────────────────────────────────────

const TTL_REGISTRY: Record<string, number> = {
  'guild:config': 300,
  'guild:module-state': 120,
  'guild:module-catalog': 300,
  'guild:roles': 120,
  'user:blacklist': 120,
  cooldown: 60,
  'paginate:session': 900,
  form: 60,
};

const DEFAULT_TTL_SECONDS = 60;

export function ttlSecondsForFamily(family: string): number {
  return TTL_REGISTRY[family] ?? DEFAULT_TTL_SECONDS;
}

// ── Negative-cache sentinel ───────────────────────────────────────────────

export const NEGATIVE_CACHE_SENTINEL = '__DUMBY_CACHE_NULL__' as const;
export const NEGATIVE_CACHE_TTL_SECONDS = 30;

export function isNegativeCacheSentinel(value: unknown): boolean {
  return value === NEGATIVE_CACHE_SENTINEL;
}

// ── Probabilistic early recompute (PER) ──────────────────────────────────

/**
 * Returns true when the caller should proactively recompute the cached value
 * before it expires, to avoid a burst of simultaneous misses on a hot key.
 *
 * @param remainingTtlMs  How many ms are left before the cached value expires.
 * @param computeDurationMs  How long (ms) the recompute function typically takes.
 * @param beta  Amplification factor (blueprint default 1).
 * @param random  Supplier of a uniform [0,1) random number (injectable for tests).
 */
export function shouldEarlyRecompute(
  remainingTtlMs: number,
  computeDurationMs: number,
  beta = 1,
  random: () => number = Math.random,
): boolean {
  if (remainingTtlMs <= 0) return true;
  if (computeDurationMs <= 0) return false;

  // PER: trigger when -computeDurationMs * β * ln(rand) >= remainingTtlMs
  const threshold = -computeDurationMs * beta * Math.log(random());
  return threshold >= remainingTtlMs;
}

// ── Key builders ─────────────────────────────────────────────────────────

/** `guild:{guildId}:config` */
export function guildConfigKey(guildId: string): string {
  return `guild:${guildId}:config`;
}

/** `guild:{guildId}:module-catalog` */
export function guildModuleCatalogKey(guildId: string): string {
  return `guild:${guildId}:module-catalog`;
}

/** `guild:{guildId}:module-state:{moduleId}` */
export function guildModuleStateKey(guildId: string, moduleId: string): string {
  return `guild:${guildId}:module-state:${moduleId}`;
}

/** `guild:{guildId}:roles` */
export function guildRolesKey(guildId: string): string {
  return `guild:${guildId}:roles`;
}

/** `user:{userId}:blacklist` */
export function userBlacklistKey(userId: string): string {
  return `user:${userId}:blacklist`;
}

/**
 * `cooldown:{scope}:{commandName}:{userId}`
 * scope is typically 'user' or 'guild'.
 */
export function cooldownKey(scope: string, commandName: string, entityId: string): string {
  return `cooldown:${scope}:${commandName}:${entityId}`;
}

/** `paginate:session:{sessionId}` */
export function paginateSessionKey(sessionId: string): string {
  return `paginate:session:${sessionId}`;
}

/** `form:{workflowId}:{userId}:{guildId}` */
export function formStateKey(workflowId: string, userId: string, guildId: string): string {
  return `form:${workflowId}:${userId}:${guildId}`;
}
