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

export const NEGATIVE_CACHE_SENTINEL = '__DUMBY_CACHE_NULL__' as const;
export const NEGATIVE_CACHE_TTL_SECONDS = 30;

export function isNegativeCacheSentinel(value: unknown): boolean {
  return value === NEGATIVE_CACHE_SENTINEL;
}

export function shouldEarlyRecompute(
  remainingTtlMs: number,
  computeDurationMs: number,
  beta = 1,
  random: () => number = Math.random,
): boolean {
  if (remainingTtlMs <= 0) return true;
  if (computeDurationMs <= 0) return false;

  const threshold = -computeDurationMs * beta * Math.log(random());
  return threshold >= remainingTtlMs;
}

export function guildConfigKey(guildId: string): string {
  return `guild:${guildId}:config`;
}

export function guildModuleCatalogKey(guildId: string): string {
  return `guild:${guildId}:module-catalog`;
}

export function guildModuleStateKey(guildId: string, moduleId: string): string {
  return `guild:${guildId}:module-state:${moduleId}`;
}

export function guildRolesKey(guildId: string): string {
  return `guild:${guildId}:roles`;
}

export function userBlacklistKey(userId: string): string {
  return `user:${userId}:blacklist`;
}

export function cooldownKey(scope: string, commandName: string, entityId: string): string {
  return `cooldown:${scope}:${commandName}:${entityId}`;
}

export function paginateSessionKey(sessionId: string): string {
  return `paginate:session:${sessionId}`;
}

export function formStateKey(workflowId: string, userId: string, guildId: string): string {
  return `form:${workflowId}:${userId}:${guildId}`;
}
