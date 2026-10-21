import type { FastifyInstance } from 'fastify';
import { handleDeployRequest } from '../../module-system/deploy-request.js';
import type { DeployModuleDeps } from '../../module-system/deploy-module.js';

/** The dependencies the module-deploy surface needs — the same ones the Swastik service supplies. */
export type DeployRoutesDeps = DeployModuleDeps;

/**
 * UR-20261021-095 / Option 3 — the module deploy surface on the API.
 *
 * Mounted only when the operator opts in (`SWASTIK_DEPLOY_ON_API`), so the upload → approve → deploy →
 * reload pathway is reachable in production without a second process. It runs the SAME request handler
 * the Swastik service runs — `handleDeployRequest` — so every check (developer approved, licence,
 * module ownership, compatibility ledger) and the full orchestration apply; nothing is skipped.
 *
 * It stays behind the internal API key: the server's auth hook protects the `/internal/` prefix.
 */
export function registerModuleDeployRoutes(app: FastifyInstance, deps: DeployRoutesDeps): void {
  app.post('/internal/deploy', async (request, reply) => {
    const result = await handleDeployRequest(deps, request.body);
    return reply.code(result.code).send(result.body);
  });
}
