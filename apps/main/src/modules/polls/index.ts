import type { Container } from '../../di/container.js';
import { CORE_TOKENS, moduleTokenNamespace } from '../../di/tokens.js';
import { PollsService } from './service.js';
import { PollsRepository } from './repository.js';

/**
 * Polls module lifecycle hooks (onLoad/onReady/onUnload).
 * This is the ONLY place the module registers itself into the DI
 * container; every other file in the module is a plain, independently
 * testable unit. By the time onLoad runs (bootstrap Stage 12, after
 * Stage 09 DI_BOOTSTRAP), CORE_TOKENS.Db is already registered, so the
 * repository is wired to the real connection pool rather than a stub.
 */
const tokens = moduleTokenNamespace('polls');
export const PollsTokens = {
  Service: tokens.token<PollsService>('Service'),
  Repository: tokens.token<PollsRepository>('Repository'),
};

export function onLoad(container: Container): void {
  container.register(PollsTokens.Repository, (c) => new PollsRepository(c.resolve(CORE_TOKENS.Db).knex));
  container.register(PollsTokens.Service, (c) =>
    new PollsService(c.resolve(PollsTokens.Repository), {
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
