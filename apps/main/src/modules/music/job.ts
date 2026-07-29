import type { Job } from 'bullmq';
import type { MusicService } from './service.js';

export interface MusicSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "music-selftest-job". */
export function createMusicSelfTestProcessor(service: MusicService) {
  return async function musicSelfTestProcessor(_job: Job<MusicSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
