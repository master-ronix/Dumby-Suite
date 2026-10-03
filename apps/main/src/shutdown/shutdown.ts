import type { FastifyInstance } from 'fastify';
import type { Logger } from '../logging/logger.js';
import type { QueueManager } from '../queue/queue-manager.js';
import type { DbClient } from '../db/client.js';
import type { Redis } from 'ioredis';
import type { Client } from 'discord.js';
import type { ModuleLoader } from '../module-system/loader.js';
import { type SHUTDOWN_STEPS, shutdownStepNumber } from '../bootstrap/stages.js';
import { shutdownTracing } from '../tracing/tracing.js';

export interface ShutdownDeps {
  logger: Logger;
  apiServer: FastifyInstance;
  healthServer: FastifyInstance;
  metricsServer: FastifyInstance;
  moduleLoader: ModuleLoader;
  moduleOrder: readonly string[];
  queue: QueueManager;
  redis: Redis;
  queueRedis: Redis;
  db: DbClient;
  discordClient?: Client | undefined;
  stopEventLoopMonitor?: () => void;
  drainInFlightCommands: (timeoutMs: number) => Promise<void>;
  stepTimeoutsMs?: Partial<Record<(typeof SHUTDOWN_STEPS)[number], number>>;
}

export const SHUTDOWN_STEP_TIMEOUTS_MS: Record<(typeof SHUTDOWN_STEPS)[number], number> = {
  STOP_ACCEPTING_GATEWAY_EVENTS: 30_000,
  DRAIN_IN_FLIGHT_COMMANDS: 30_000,
  UNLOAD_MODULES_REVERSE_ORDER: 30_000,
  DRAIN_QUEUES_AND_DEAD_LETTER: 60_000,
  CLOSE_HTTP_SERVER: 10_000,
  FLUSH_LOGS_AND_TRACES: 5000,
  CLOSE_QUEUE_CONNECTIONS: 5000,
  CLOSE_REDIS_CONNECTION: 5000,
  CLOSE_DATABASE_POOL: 5000,
};

let acceptingGatewayEvents = true;
export function isAcceptingGatewayEvents(): boolean {
  return acceptingGatewayEvents;
}

export async function gracefulShutdown(deps: ShutdownDeps, signal: string): Promise<void> {
  deps.logger.info('shutdown-initiated', { signal });

  await runStep(deps, 'STOP_ACCEPTING_GATEWAY_EVENTS', async () => {
    acceptingGatewayEvents = false;
    deps.stopEventLoopMonitor?.();
    await deps.discordClient?.destroy();
  });

  await runStep(deps, 'DRAIN_IN_FLIGHT_COMMANDS', () =>
    deps.drainInFlightCommands(timeoutFor(deps, 'DRAIN_IN_FLIGHT_COMMANDS')),
  );

  await runStep(deps, 'UNLOAD_MODULES_REVERSE_ORDER', () =>
    deps.moduleLoader.unloadAll(deps.moduleOrder),
  );

  await runStep(deps, 'DRAIN_QUEUES_AND_DEAD_LETTER', () => deps.queue.shutdown());

  await runStep(deps, 'CLOSE_HTTP_SERVER', async () => {
    await deps.apiServer.close();
    await deps.healthServer.close();
    await deps.metricsServer.close();
  });

  await runStep(deps, 'FLUSH_LOGS_AND_TRACES', () => shutdownTracing());

  await runStep(deps, 'CLOSE_QUEUE_CONNECTIONS', async () => {
    deps.queueRedis.disconnect();
  });

  await runStep(deps, 'CLOSE_REDIS_CONNECTION', async () => {
    deps.redis.disconnect();
  });

  await runStep(deps, 'CLOSE_DATABASE_POOL', () => deps.db.destroy());

  deps.logger.info('shutdown-complete', { signal });
}

async function runStep(
  deps: ShutdownDeps,
  step: keyof typeof SHUTDOWN_STEP_TIMEOUTS_MS,
  fn: () => Promise<void>,
): Promise<void> {
  const stepNumber = shutdownStepNumber(step);
  const timeoutMs = timeoutFor(deps, step);
  const started = Date.now();
  try {
    await Promise.race([fn(), timeout(timeoutMs, step)]);
    deps.logger.info('shutdown-step-complete', {
      step: stepNumber,
      name: step,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    deps.logger.error('shutdown-step-failed', { step: stepNumber, name: step, error: String(err) });
  }
}

function timeoutFor(deps: ShutdownDeps, step: keyof typeof SHUTDOWN_STEP_TIMEOUTS_MS): number {
  return deps.stepTimeoutsMs?.[step] ?? SHUTDOWN_STEP_TIMEOUTS_MS[step];
}

function timeout(ms: number, step: string): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error(`Shutdown step "${step}" exceeded its ${ms}ms ceiling`)), ms);
  });
}

export function registerShutdownSignalHandlers(deps: ShutdownDeps): void {
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void gracefulShutdown(deps, signal).then(() => process.exit(0));
    });
  }
}
