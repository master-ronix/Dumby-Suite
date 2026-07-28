import type { ReactionRolesService } from './service.js';

export interface RouteHandlerContext {
  service: ReactionRolesService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/reaction-roles/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleReactionRolesSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
