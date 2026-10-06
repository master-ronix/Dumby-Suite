import type { FastifyInstance } from 'fastify';
import type { MetricsRegistry } from '../../metrics/registry.js';

export function registerMetricsRoutes(app: FastifyInstance, metrics: MetricsRegistry): void {
  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', metrics.contentType());
    return reply.send(await metrics.metricsText());
  });
}
