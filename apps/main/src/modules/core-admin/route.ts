import type { CoreAdminService } from './service.js';

export interface RouteHandlerContext {
  service: CoreAdminService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/core-admin/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleCoreAdminSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
