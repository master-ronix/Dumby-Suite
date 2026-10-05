import type { FastifyInstance } from 'fastify';
import type { MdisService } from './mdis.service.js';
import { UnknownModuleError } from './mdis.service.js';

/** Appendix C #18 — the MDIS REST module-delivery surface. */
export interface MdisRoutesDeps {
  readonly service: MdisService;
}

export function registerMdisRoutes(app: FastifyInstance, deps: MdisRoutesDeps): void {
  app.get('/mdis/catalog', async (_req, reply) => {
    return reply.code(200).send({ modules: deps.service.catalog() });
  });

  app.get('/mdis/modules/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const entry = deps.service.getModule(slug);
    if (entry === undefined) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(200).send(entry);
  });

  app.get('/mdis/guilds/:guildId/installed', async (req, reply) => {
    const { guildId } = req.params as { guildId: string };
    return reply.code(200).send({ installed: await deps.service.installed(guildId) });
  });

  app.post('/mdis/guilds/:guildId/install', async (req, reply) => {
    const { guildId } = req.params as { guildId: string };
    const { slug } = req.body as { slug?: string };
    if (slug === undefined || slug.length === 0) {
      return reply.code(400).send({ error: 'slug is required' });
    }
    try {
      await deps.service.install(guildId, slug);
    } catch (err) {
      if (err instanceof UnknownModuleError) return reply.code(404).send({ error: 'NOT_FOUND' });
      throw err;
    }
    return reply.code(200).send({ ok: true });
  });

  app.post('/mdis/guilds/:guildId/uninstall', async (req, reply) => {
    const { guildId } = req.params as { guildId: string };
    const { slug } = req.body as { slug?: string };
    if (slug === undefined || slug.length === 0) {
      return reply.code(400).send({ error: 'slug is required' });
    }
    await deps.service.uninstall(guildId, slug);
    return reply.code(200).send({ ok: true });
  });
}
