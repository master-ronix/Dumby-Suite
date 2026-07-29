import type { FastifyInstance } from 'fastify';
import type { ConfigService } from '../../config/config.service.js';

const processStartedAt = Date.now();

export function registerInfoRoutes(app: FastifyInstance, config: ConfigService): void {
  app.get('/api/info', async (_req, reply) => {
    return reply.code(200).send({
      name: 'dumby-headless-backend',
      version: '1.0.0-v1',
      environment: config.get('NODE_ENV'),
      uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
    });
  });
}
