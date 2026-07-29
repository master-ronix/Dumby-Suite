import type { Container } from '../../di/container.js';
import { CORE_TOKENS, moduleTokenNamespace } from '../../di/tokens.js';
import { StarboardService } from './service.js';
import { StarboardRepository } from './repository.js';

/**
 * Starboard module lifecycle hooks (onLoad/onReady/onUnload).
 * This is the ONLY place the module registers itself into the DI
 * container; every other file in the module is a plain, independently
 * testable unit. By the time onLoad runs (bootstrap Stage 12, after
 * Stage 09 DI_BOOTSTRAP), CORE_TOKENS.Db is already registered, so the
 * repository is wired to the real connection pool rather than a stub.
 */
const tokens = moduleTokenNamespace('starboard');
export const StarboardTokens = {
  Service: tokens.token<StarboardService>('Service'),
  Repository: tokens.token<StarboardRepository>('Repository'),
};

export function onLoad(container: Container): void {
  container.register(StarboardTokens.Repository, (c) => new StarboardRepository(c.resolve(CORE_TOKENS.Db).knex));
  container.register(StarboardTokens.Service, (c) =>
    new StarboardService(c.resolve(StarboardTokens.Repository), {
      emit: (eventName, payload) => c.resolve(CORE_TOKENS.EventBus).emit(eventName, payload),
    }),
  );
}

export function onReady(): void {
  // No gateway-shaped readiness work required for this illustrative module.
}

export function onUnload(): void {
  // No held resources to release for this illustrative module.
}
