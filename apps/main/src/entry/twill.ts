import Fastify from 'fastify';
import { isMainEntry } from './is-main-entry.js';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { registerInternalAuth } from '../http/internal-auth.js';

const env = parseEnv(pickEnvKeys(process.env));
const logger = createLogger(env.LOG_LEVEL);

const app = Fastify({ logger: false });

registerInternalAuth(app, {
  expectedKey: env.INTERNAL_API_KEY,
});

const NOT_IMPLEMENTED = (surface: string) => ({
  error: 'Not Implemented',
  reason:
    `Twill "${surface}" is stubbed in v5.0: no operational personas are hosted. ` +
    `Specified at blueprint.md §35.5 / §44 (Twill family); scope and gates at ` +
    `ADR-008 (free charter / sunset) and ADR-011 (registration API is the only ` +
    `persona-creation surface). Infrastructure provisioning is reserved to ` +
    `process owners and is not stubbed in.`,
});

app.post<{
  Body: {
    name?: string;
    discordApplicationId?: string;
    boundGuildId?: string;
    registrarAuthority?: string;
    dmBehavior?: 'prohibited' | 'allowed';
  };
}>('/twill/personas/register', async (_request, reply) => {
  logger.warn('twill-register-stubbed');
  return reply.code(501).send(NOT_IMPLEMENTED('persona registration'));
});

app.get<{ Params: { personaId: string } }>(
  '/twill/personas/:personaId',
  async (_request, reply) => {
    return reply.code(501).send(NOT_IMPLEMENTED('persona detail'));
  },
);

app.get<{ Params: { personaId: string } }>(
  '/twill/personas/:personaId/status',
  async (_request, reply) => {
    return reply.code(501).send(NOT_IMPLEMENTED('persona status'));
  },
);

app.get<{ Params: { personaId: string } }>(
  '/twill/personas/:personaId/charter',
  async (_request, reply) => {
    return reply.code(501).send(NOT_IMPLEMENTED('charter status (ADR-008 sunset readout)'));
  },
);

app.post<{
  Params: { personaId: string };
  Body: { guildId?: string; moduleSlug?: string };
}>('/twill/personas/:personaId/bindings', async (_request, reply) => {
  logger.warn('twill-bind-stubbed');
  return reply.code(501).send(NOT_IMPLEMENTED('persona binding'));
});

app.delete<{
  Params: { personaId: string; moduleSlug: string };
}>('/twill/personas/:personaId/bindings/:moduleSlug', async (_request, reply) => {
  return reply.code(501).send(NOT_IMPLEMENTED('persona unbinding'));
});

if (isMainEntry(import.meta.url, process.argv[1])) {
  app
    .listen({ port: env.TWILL_PORT, host: env.TWILL_BIND_HOST })
    .then(() => {
      logger.info('twill-stub-started', { port: env.TWILL_PORT });
    })
    .catch((err: unknown) => {
      logger.fatal('twill-stub-start-failed', { error: String(err) });
      process.exit(1);
    });
}
