export const BOOTSTRAP_STAGES = [
  'PROCESS_SETUP',
  'CONFIG_LOAD',
  'HEALTH_SERVER_INIT',
  'OBSERVABILITY_INIT',
  'DATABASE_CONNECT',
  'MIGRATION_RUN',
  'CACHE_CONNECT',
  'QUEUE_INIT',
  'DI_BOOTSTRAP',
  'MODULE_DISCOVER',
  'MODULE_VALIDATE',
  'MODULE_LOAD',
  'COMMAND_REGISTER',
  'EVENT_REGISTER',
  'DISCORD_LOGIN',
  'CLIENT_READY',
  'MODULE_READY',
  'STARTUP_COMPLETE',
] as const;

export type BootstrapStage = (typeof BOOTSTRAP_STAGES)[number];

export function stageNumber(stage: BootstrapStage): number {
  return BOOTSTRAP_STAGES.indexOf(stage) + 1;
}

export const SHUTDOWN_STEPS = [
  'STOP_ACCEPTING_GATEWAY_EVENTS',
  'DRAIN_IN_FLIGHT_COMMANDS',
  'UNLOAD_MODULES_REVERSE_ORDER',
  'DRAIN_QUEUES_AND_DEAD_LETTER',
  'CLOSE_HTTP_SERVER',
  'FLUSH_LOGS_AND_TRACES',
  'CLOSE_QUEUE_CONNECTIONS',
  'CLOSE_REDIS_CONNECTION',
  'CLOSE_DATABASE_POOL',
] as const;

export type ShutdownStep = (typeof SHUTDOWN_STEPS)[number];

export function shutdownStepNumber(step: ShutdownStep): number {
  return SHUTDOWN_STEPS.indexOf(step) + 1;
}

export class BootstrapProgress {
  private currentStageIndex = -1;
  private requiredModulesHealthy = false;
  private readonly startedAt = Date.now();

  /**
   * Announce every stage on the way through.
   *
   * `advanceTo` used to move a counter and say nothing, so a boot that stalled produced NO output at
   * all: the host's port scan timed out fifteen minutes later and reported a deploy failure with no
   * cause anywhere in the log. The last `bootstrap-stage` line now names exactly where a boot stopped.
   *
   * `console.log` rather than the logger on purpose — this must work from PROCESS_SETUP, before the
   * logger is constructed.
   */
  advanceTo(stage: BootstrapStage): void {
    const idx = BOOTSTRAP_STAGES.indexOf(stage);
    if (idx < this.currentStageIndex) {
      throw new RangeError(
        `Cannot move bootstrap backward: already at stage ${this.currentStageIndex + 1}, attempted stage ${idx + 1}`,
      );
    }
    this.currentStageIndex = idx;
    // `process.stdout.write`, not `console`: this file is under the `no-console` rule, and the write
    // must work from PROCESS_SETUP, before the logger exists.
    process.stdout.write(`bootstrap-stage: ${stage} (${Date.now() - this.startedAt}ms)\n`);
  }

  hasReached(stage: BootstrapStage): boolean {
    return this.currentStageIndex >= BOOTSTRAP_STAGES.indexOf(stage);
  }

  setRequiredModulesHealthy(healthy: boolean): void {
    this.requiredModulesHealthy = healthy;
  }

  isLive(): boolean {
    return this.hasReached('OBSERVABILITY_INIT');
  }

  isStarted(): boolean {
    return this.hasReached('DISCORD_LOGIN');
  }

  isReady(): boolean {
    return this.hasReached('STARTUP_COMPLETE') && this.requiredModulesHealthy;
  }

  currentStage(): BootstrapStage | null {
    return this.currentStageIndex >= 0 ? (BOOTSTRAP_STAGES[this.currentStageIndex] ?? null) : null;
  }
}
