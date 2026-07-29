import type { Container } from '../../di/container.js';
import { CORE_TOKENS, moduleTokenNamespace } from '../../di/tokens.js';
import { WelcomeService } from './service.js';
import { WelcomeRepository } from './repository.js';

/**
 * Welcome module lifecycle hooks (onLoad/onReady/onUnload).
 * This is the ONLY place the module registers itself into the DI
 * container; every other file in the module is a plain, independently
 * testable unit. By the time onLoad runs (bootstrap Stage 12, after
 * Stage 09 DI_BOOTSTRAP), CORE_TOKENS.Db is already registered, so the
 * repository is wired to the real connection pool rather than a stub.
 */
const tokens = moduleTokenNamespace('welcome');
export const WelcomeTokens = {
  Service: tokens.token<WelcomeService>('Service'),
  Repository: tokens.token<WelcomeRepository>('Repository'),
};

export function onLoad(container: Container): void {
  container.register(WelcomeTokens.Repository, (c) => new WelcomeRepository(c.resolve(CORE_TOKENS.Db).knex));
  container.register(WelcomeTokens.Service, (c) =>
    new WelcomeService(c.resolve(WelcomeTokens.Repository), {
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
