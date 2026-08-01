/**
 * Priority 70: CooldownMiddleware (Cluster: Ring).
 * Per-user-per-command cooldown. Fails → reject with remaining time.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';

export interface CooldownStore {
  getRemainingMs(userId: string, commandName: string): Promise<number>;
  record(userId: string, commandName: string, cooldownMs: number): Promise<void>;
}

export interface CooldownConfig {
  getCooldownMs(commandName: string): number;
}

export class CooldownMiddleware implements Middleware {
  readonly priority = 70;

  constructor(
    private readonly store: CooldownStore,
    private readonly config: CooldownConfig,
  ) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    const cooldownMs = this.config.getCooldownMs(ctx.commandName);
    if (cooldownMs <= 0) {
      await next();
      return;
    }

    const remaining = await this.store.getRemainingMs(ctx.userId, ctx.commandName);
    if (remaining > 0) {
      throw new MiddlewareRejectError(
        429,
        `Cooldown active. Try again in ${Math.ceil(remaining / 1000)}s`,
        false,
      );
    }

    await next();

    // Record the cooldown after the command runs successfully.
    await this.store.record(ctx.userId, ctx.commandName, cooldownMs);
  }
}

/** In-memory cooldown store for tests and single-node deployments. */
export class InMemoryCooldownStore implements CooldownStore {
  private readonly entries = new Map<string, number>();

  private key(userId: string, commandName: string): string {
    return `${userId}:${commandName}`;
  }

  async getRemainingMs(userId: string, commandName: string): Promise<number> {
    const expiry = this.entries.get(this.key(userId, commandName));
    if (expiry === undefined) return 0;
    return Math.max(0, expiry - Date.now());
  }

  async record(userId: string, commandName: string, cooldownMs: number): Promise<void> {
    this.entries.set(this.key(userId, commandName), Date.now() + cooldownMs);
  }
}
