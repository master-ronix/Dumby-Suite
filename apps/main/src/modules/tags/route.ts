import type { TagsService } from './service.js';

export interface RouteHandlerContext {
  service: TagsService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/tags/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleTagsSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
