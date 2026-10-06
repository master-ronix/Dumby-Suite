import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { FastifyInstance } from 'fastify';
import type { ConfigService } from '../../config/config.service.js';

const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve('../../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  version: string;
};

const processStartedAt = Date.now();

export function registerInfoRoutes(app: FastifyInstance, config: ConfigService): void {
  app.get('/api/info', async (_req, reply) => {
    return reply.code(200).send({
      name: 'dumby-headless-backend',
      version: packageJson.version,
      environment: config.get('NODE_ENV'),
      uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
      runtimeVersions: {
        node: process.versions.node,
        v8: process.versions.v8,
      },
    });
  });

  // Appendix C #11 — publish the REST/MDIS OpenAPI contract so the HTTP families are discoverable.
  app.get('/openapi.yaml', async (_req, reply) => {
    const contractPath = config.get('OPENAPI_CONTRACT_PATH');
    if (!existsSync(contractPath)) {
      return reply.code(501).send({ error: 'OPENAPI_CONTRACT_UNAVAILABLE' });
    }
    return reply.code(200).type('application/yaml').send(readFileSync(contractPath, 'utf8'));
  });
}
