import type { MusicService } from './service.js';

/**
 * The module's one scheduled task: a self-test heartbeat. Registered with
 * the Scheduler under lock key "lock:task:music-selftest-heartbeat".
 */
export const Music_SELFTEST_HEARTBEAT_CRON = '*/15 * * * *';

export function createMusicSelfTestHeartbeat(service: MusicService) {
  return async function musicSelfTestHeartbeat(): Promise<void> {
    await service.selfTest();
  };
}
