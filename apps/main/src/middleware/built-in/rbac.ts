/**
 * Priority 60: RBACMiddleware (Cluster: Ring).
 * Runs Layer 6 of the permission engine: Dumby RBAC role check.
 * Skipped entirely for Core-tier commands (blueprint.md §18.6).
 * Fails closed → reject.
 */
import type { Middleware, MiddlewareContext, NextFn } from '../base-middleware.js';
import { MiddlewareRejectError } from '../base-middleware.js';
import type { RbacRole } from '../../permissions/rbac.js';
import { roleMeetsRequirement } from '../../permissions/rbac.js';

export interface RbacResolver {
  getHighestRole(userId: string, guildId: string): Promise<RbacRole | null>;
  getRequiredRole(commandName: string): RbacRole | null;
  isCoreTierCommand(commandName: string): boolean;
}

export class RBACMiddleware implements Middleware {
  readonly priority = 60;

  constructor(private readonly resolver: RbacResolver) {}

  async execute(ctx: MiddlewareContext, next: NextFn): Promise<void> {
    // Core-tier commands skip Layer 6 entirely.
    if (!ctx.guildId || this.resolver.isCoreTierCommand(ctx.commandName)) {
      await next();
      return;
    }

    const required = this.resolver.getRequiredRole(ctx.commandName);
    if (!required) {
      await next();
      return;
    }

    const actual = (await this.resolver.getHighestRole(ctx.userId, ctx.guildId)) ?? 'MEMBER';
    if (!roleMeetsRequirement(actual, required)) {
      throw new MiddlewareRejectError(403, `Requires role ${required}; you have ${actual}`, false);
    }

    await next();
  }
}
