import Fastify, { type FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { Logger } from '../logging/logger.js';
import type { BootstrapProgress } from '../bootstrap/stages.js';
import type { MetricsRegistry } from '../metrics/registry.js';
import type { ConfigService } from '../config/config.service.js';
import { toErrorResponse } from './error-boundary.js';
import { registerInternalAuth } from './internal-auth.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerMetricsRoutes } from './routes/metrics.routes.js';
import { registerInfoRoutes } from './routes/info.routes.js';
import { registerAdminRoutes, type AdminRoutesDeps } from './routes/admin.routes.js';

export interface BuildServerOptions {
  logger: Logger;
  progress: BootstrapProgress;
  metrics: MetricsRegistry;
  config: ConfigService;
  adminDeps: AdminRoutesDeps;
}

const ADMIN_PATH_PREFIX = '/admin/';

export function buildApiServer(options: BuildServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(helmet);
  app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.setErrorHandler((err, _req, reply) => {
    const { statusCode, body } = toErrorResponse(err);
    if (statusCode === 500) {
      options.logger.error('unhandled-http-error', { error: String(err) });
    }
    reply.code(statusCode).send(body);
  });

  registerInternalAuth(app, {
    expectedKey: options.config.get('INTERNAL_API_KEY'),
    shouldProtect: (request) => request.url.startsWith(ADMIN_PATH_PREFIX),
    audit: async (outcome, detail) => {
      if (outcome === 'rejected') {
        options.logger.warn('admin-auth-rejected', detail);
      }
    },
  });

  registerInfoRoutes(app, options.config);
  registerAdminRoutes(app, options.adminDeps);

  return app;
}

export function buildHealthServer(progress: BootstrapProgress): FastifyInstance {
  const app = Fastify({ logger: false });
  registerHealthRoutes(app, progress);
  return app;
}

export function buildMetricsServer(metrics: MetricsRegistry): FastifyInstance {
  const app = Fastify({ logger: false });
  registerMetricsRoutes(app, metrics);
  return app;
}
