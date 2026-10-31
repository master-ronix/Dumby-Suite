import Fastify from 'fastify';
import knex from 'knex';
import { isMainEntry } from './is-main-entry.js';
import { parseEnv, pickEnvKeys } from '../config/env.schema.js';
import { createLogger } from '../logging/logger.js';
import { registerInternalAuth } from '../http/internal-auth.js';
import { rootKeyFromBase64 } from '@workspace/swastik';
import knexConfig from '../db/knexfile.js';
import { PersonaCommandBindingService } from '../personas/persona-command-binding.service.js';
import {
  PostgresPersonaBindingStore,
  PostgresPersonaIdentityStore,
} from '../personas/persona.repository.js';
import { registerTwillPersonaRoutes } from '../personas/twill-registration.js';
import {
  parseRegistrarSeed,
  PostgresPersonaRegistrarStore,
  seedRegistrarsSafely,
} from '../personas/persona-registrar.repository.js';

/**
 * UR-20261012-033 — the Twill control plane.
 *
 * ADR-011 makes this the ONLY persona-creation surface, so it is no longer a stub: it wires the
 * persona service to the database and serves the registration API. Every side effect (config, the
 * pool, the listener) lives inside the `isMainEntry` guard, so importing this module in a test has
 * none (TREE 7-D / ACC-ARCH-0007-2).
 */
async function start(): Promise<void> {
  const env = parseEnv(pickEnvKeys(process.env));
  const logger = createLogger(env.LOG_LEVEL);
  const app = Fastify({ logger: false });

  registerInternalAuth(app, { expectedKey: env.INTERNAL_API_KEY });

  const nodeEnv: string = env.NODE_ENV;
  const config = knexConfig[nodeEnv] ?? knexConfig['development'];
  if (config === undefined) {
    logger.fatal('twill-no-knex-config', { nodeEnv });
    process.exit(1);
  }
  const db = knex(config);
  const rootKey = rootKeyFromBase64('local', env.ENCRYPTION_ROOT_KEY);

  const identities = new PostgresPersonaIdentityStore(db);
  const bindings = new PostgresPersonaBindingStore(db);
  const registrars = new PostgresPersonaRegistrarStore(db);
  await seedRegistrarsSafely(
    registrars,
    parseRegistrarSeed(env.PERSONA_REGISTRAR_AUTHORITIES),
    (message) => logger.warn(message),
  );
  const service = new PersonaCommandBindingService(identities, bindings, logger, registrars);

  registerTwillPersonaRoutes(app, {
    service,
    identities,
    bindings,
    registrars,
    rootKey,
    logger,
    // ADR-008 — the free-charter sunset reads measured cost signals. Neither is measurable while the
    // fleet runs on the shared deployment, so registration stays open under the free charter.
    costSignals: { dedicatedInfrastructureRequired: false, perPersonaCostMeasurable: false },
  });

  app.addHook('onClose', async () => {
    await db.destroy();
  });

  await app.listen({ port: env.TWILL_PORT, host: env.TWILL_BIND_HOST });
  logger.info('twill-started', { port: env.TWILL_PORT });
}

if (isMainEntry(import.meta.url, process.argv[1])) {
  start().catch((err: unknown) => {
    console.error('Fatal Twill start error:', err);
    process.exit(1);
  });
}
