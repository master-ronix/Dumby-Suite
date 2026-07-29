import type { Job } from 'bullmq';
import type { GuildSettingsService } from './service.js';

export interface GuildSettingsSelfTestJobData {
  requestedBy: string;
}

/** The module's one job processor: BullMQ calls this for queue "guild-settings-selftest-job". */
export function createGuildSettingsSelfTestProcessor(service: GuildSettingsService) {
  return async function guild_settingsSelfTestProcessor(_job: Job<GuildSettingsSelfTestJobData>): Promise<{ ok: boolean }> {
    const result = await service.selfTest();
    return { ok: result.ok };
  };
}
