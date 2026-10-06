import type { FastifyInstance } from 'fastify';
import { type BootstrapProgress, stageNumber } from '../bootstrap/stages.js';

export interface HealthProbes {
  liveness: boolean;
  startup: boolean;
  readiness: boolean;
}

export function readHealthProbes(progress: BootstrapProgress): HealthProbes {
  return {
    liveness: progress.isLive(),
    startup: progress.isStarted(),
    readiness: progress.isReady(),
  };
}

export function healthProbeSummary(progress: BootstrapProgress): string {
  const probes = readHealthProbes(progress);
  const stage = progress.currentStage();
  const stageNum = stage ? stageNumber(stage) : 0;
  return [
    `stage: ${stage ?? 'none'} (${stageNum}/18)`,
    `live: ${probes.liveness}`,
    `started: ${probes.startup}`,
    `ready: ${probes.readiness}`,
  ].join(' | ');
}

export function attachHealthEndpoint(server: FastifyInstance, progress: BootstrapProgress): void {
  server.get('/health/probes', async (_req, reply) => {
    return reply.code(200).send({
      ...readHealthProbes(progress),
      currentStage: progress.currentStage(),
    });
  });
}
