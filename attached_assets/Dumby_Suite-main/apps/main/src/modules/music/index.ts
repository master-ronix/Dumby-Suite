import type { Container } from '../../di/container.js';
import { CORE_TOKENS, moduleTokenNamespace } from '../../di/tokens.js';
import { MusicService } from './service.js';
import { MusicRepository } from './repository.js';

/**
 * Music module lifecycle hooks (onLoad/onReady/onUnload).
 * This is the ONLY place the module registers itself into the DI
 * container; every other file in the module is a plain, independently
 * testable unit. By the time onLoad runs (bootstrap Stage 12, after
 * Stage 09 DI_BOOTSTRAP), CORE_TOKENS.Db is already registered, so the
 * repository is wired to the real connection pool rather than a stub.
 */
const tokens = moduleTokenNamespace('music');
export const MusicTokens = {
  Service: tokens.token<MusicService>('Service'),
  Repository: tokens.token<MusicRepository>('Repository'),
};

export function onLoad(container: Container): void {
  container.register(MusicTokens.Repository, (c) => new MusicRepository(c.resolve(CORE_TOKENS.Db).knex));
  container.register(MusicTokens.Service, (c) =>
    new MusicService(c.resolve(MusicTokens.Repository), {
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
