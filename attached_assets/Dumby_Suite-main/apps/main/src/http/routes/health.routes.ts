import type { FastifyInstance } from 'fastify';
import type { BootstrapProgress } from '../../bootstrap/stages.js';

/**
 * /health/* (Cluster: Grace / Glass). Deliberately has NO dependency on the rest of
 * the app beyond BootstrapProgress — these three probes must keep working
 * even while other subsystems are degraded, since Kubernetes/Docker uses
 * them to decide whether to keep routing traffic or restart the process.
 */
export function registerHealthRoutes(app: FastifyInstance, progress: BootstrapProgress): void {
  app.get('/health/liveness', async (_req, reply) => {
    if (!progress.isLive()) {
      return reply.code(503).send({ status: 'starting', stage: progress.currentStage() });
    }
    return reply.code(200).send({ status: 'live' });
  });

  app.get('/health/startup', async (_req, reply) => {
    if (!progress.isStarted()) {
      return reply.code(503).send({ status: 'starting', stage: progress.currentStage() });
    }
    return reply.code(200).send({ status: 'started' });
  });

  app.get('/health/readiness', async (_req, reply) => {
    if (!progress.isReady()) {
      return reply.code(503).send({ status: 'not-ready', stage: progress.currentStage() });
    }
    return reply.code(200).send({ status: 'ready' });
  });
}
