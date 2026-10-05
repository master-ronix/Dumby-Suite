import type { FastifyInstance } from 'fastify';
import type { OperationalService } from './operational.service.js';

/** Appendix C #18 — the operational tooling REST surface. */
export interface OperationalRoutesDeps {
  readonly service: OperationalService;
}

export function registerOperationalRoutes(app: FastifyInstance, deps: OperationalRoutesDeps): void {
  app.get('/operational/status', async (_req, reply) => {
    return reply.code(200).send(deps.service.status());
  });

  app.get('/operational/runbooks', async (_req, reply) => {
    return reply.code(200).send({ runbooks: deps.service.runbooks() });
  });
}
