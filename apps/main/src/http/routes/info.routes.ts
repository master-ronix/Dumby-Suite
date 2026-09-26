import { readFileSync } from 'node:fs';
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
}
