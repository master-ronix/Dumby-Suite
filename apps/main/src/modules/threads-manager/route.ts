import type { ThreadsManagerService } from './service.js';

export interface RouteHandlerContext {
  service: ThreadsManagerService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/threads-manager/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleThreadsManagerSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
