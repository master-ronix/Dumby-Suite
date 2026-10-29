import type { ModuleRegistry } from '../module-system/registry.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
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
import { registerOAuthRoutes } from './routes/oauth.routes.js';
import { registerMdisRoutes, type MdisRoutesDeps } from '../mdis/mdis.routes.js';
import {
  registerOperationalRoutes,
  type OperationalRoutesDeps,
} from '../operational/operational.routes.js';
import type { OAuthRoutesDeps } from './routes/oauth.routes.js';
import {
  registerTwillPersonaRoutes,
  type TwillPersonaRouteDeps,
} from '../personas/twill-registration.js';
import { registerModuleDeployRoutes, type DeployRoutesDeps } from './routes/deploy.routes.js';

export interface BuildServerOptions {
  logger: Logger;
  progress: BootstrapProgress;
  metrics: MetricsRegistry;
  config: ConfigService;
  adminDeps: AdminRoutesDeps;
  /** §19.7 — present only when the Discord OAuth2 dashboard credentials are configured. */
  oauthDeps?: OAuthRoutesDeps | undefined;
  /**
   * UR-20261029-111 — the module registry, so a module's DECLARED asset is served from the module's own
   * directory. The host holds no copy of a module's artwork: it resolves `ui.banner` / `ui.iconAsset`
   * against the root the loader recorded.
   */
  moduleRegistry?: ModuleRegistry | undefined;
  /** Appendix C #18 — the MDIS module-delivery surface. */
  mdisDeps?: MdisRoutesDeps;
  /** Appendix C #18 — the operational tooling surface. */
  operationalDeps?: OperationalRoutesDeps;
  /**
   * UR-20261012-034 — the Twill persona registration surface, mounted here only when the operator
   * opts in (TWILL_ROUTES_ON_API). It stays behind the internal API key like the other privileged
   * surfaces.
   */
  twillPersonaDeps?: TwillPersonaRouteDeps | undefined;
  /**
   * UR-20261021-095 / Option 3 — the module deploy surface, mounted here only when the operator opts
   * in (SWASTIK_DEPLOY_ON_API). It runs the same request handler the Swastik service runs, and stays
   * behind the internal API key.
   */
  deployDeps?: DeployRoutesDeps | undefined;
}

const ADMIN_PATH_PREFIX = '/admin/';

/**
 * §11.5 - the Mode D banner asset. It ships in the image and is served here, on the API surface
 * Railway routes the public domain to, so Discord can load it as a media gallery without any
 * external host. One image serves every page (the same banner on every module page).
 */
const BANNER_ASSET = new URL('../../assets/dumby-banner.png', import.meta.url);
/** item 6 — the dashboard's own banner; every other module uses the default above. */

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
    shouldProtect: (request) =>
      request.url.startsWith(ADMIN_PATH_PREFIX) ||
      request.url.startsWith('/mdis/') ||
      request.url.startsWith('/operational/') ||
      request.url.startsWith('/twill/') ||
      // UR-20261021-095 — the module deploy surface (and any other /internal/* route) is privileged.
      request.url.startsWith('/internal/'),
    audit: async (outcome, detail) => {
      if (outcome === 'rejected') {
        options.logger.warn('admin-auth-rejected', detail);
      }
    },
  });

  registerInfoRoutes(app, options.config);
  // Health + metrics are served on the API surface too, so an orchestrator that probes a
  // single port (Railway healthchecks the PORT variable) reaches /health/liveness and
  // /metrics here rather than getting a 404. The dedicated health (HEALTH_PORT) and
  // metrics (METRICS_PORT) servers still exist and remain the canonical probes.
  registerHealthRoutes(app, options.progress);
  registerMetricsRoutes(app, options.metrics);
  registerAdminRoutes(app, options.adminDeps);
  if (options.mdisDeps !== undefined) {
    registerMdisRoutes(app, options.mdisDeps);
  }
  if (options.operationalDeps !== undefined) {
    registerOperationalRoutes(app, options.operationalDeps);
  }
  if (options.oauthDeps !== undefined) {
    registerOAuthRoutes(app, options.oauthDeps);
  }
  if (options.twillPersonaDeps !== undefined) {
    registerTwillPersonaRoutes(app, options.twillPersonaDeps);
  }
  if (options.deployDeps !== undefined) {
    registerModuleDeployRoutes(app, options.deployDeps);
  }

  app.get('/assets/dumby-banner.png', async (_req, reply) => {
    try {
      const bytes = await readFile(BANNER_ASSET);
      return reply
        .header('content-type', 'image/png')
        .header('cache-control', 'public, max-age=86400')
        .send(bytes);
    } catch {
      return reply.code(404).send({ error: 'banner asset not found' });
    }
  });

  /**
   * UR-20261029-111 — a module's own assets, served from the module's own directory.
   *
   * `/modules/:slug/:asset` resolves the slug through the registry and reads the file beneath the root
   * the loader recorded, refusing anything that escapes it. The host serves the bytes; it does not own
   * them, and it holds no copy of a module's banner or logo.
   */
  app.get('/modules/:slug/:asset', async (req, reply) => {
    const { slug, asset } = req.params as { slug: string; asset: string };
    const entry = options.moduleRegistry?.all().find((module) => module.manifest.name === slug);
    const root = entry?.root;
    if (root === undefined) return reply.code(404).send({ error: 'module asset not found' });
    const path = resolve(root, asset);
    // A module may not reach outside its own directory, however it spells the path.
    if (!path.startsWith(resolve(root))) {
      return reply.code(400).send({ error: 'module asset outside the module' });
    }
    try {
      const bytes = await readFile(path);
      return reply
        .header('content-type', 'image/png')
        .header('cache-control', 'public, max-age=86400')
        .send(bytes);
    } catch {
      return reply.code(404).send({ error: 'module asset not found' });
    }
  });

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
