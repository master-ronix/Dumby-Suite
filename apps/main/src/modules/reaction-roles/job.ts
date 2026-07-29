import type { Job } from 'bullmq';
import type { ReactionRolesService } from './service.js';

export interface ReactionRolesSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "reaction-roles-selftest-job". */
export function createReactionRolesSelfTestProcessor(service: ReactionRolesService) {
  return async function reaction_rolesSelfTestProcessor(_job: Job<ReactionRolesSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
