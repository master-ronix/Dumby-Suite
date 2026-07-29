import type { MusicService } from './service.js';

export interface RouteHandlerContext {
  service: MusicService;
}

/**
 * The module's one Fastify route. Registered as GET /api/modules/music/selftest
 * per the MDIS backend contract (spec section 24).
 */
export async function handleMusicSelfTestRoute(ctx: RouteHandlerContext): Promise<{ ok: boolean; moduleSlug: string }> {
  const result = await ctx.service.selfTest();
  return { ok: result.ok, moduleSlug: result.moduleSlug };
}
