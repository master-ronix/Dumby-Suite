import type { GuildSettingsService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:guild-settings-selftest-heartbeat".
 */
export const GuildSettings_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createGuildSettingsSelfTestHeartbeat(service: GuildSettingsService) {
  return async function guild_settingsSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
