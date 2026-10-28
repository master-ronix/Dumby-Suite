import { bootstrap } from '../bootstrap/bootstrap.js';
import { isMainEntry } from './is-main-entry.js';
import { startLivenessHolder } from './liveness-holder.js';

/**
 * UR-20261028-110 — hold the platform's port BEFORE bootstrap, not after it.
 *
 * Bootstrap takes minutes (gateway login, module load, persona start, guild registration) and the API
 * server only listens at the end of it, so the process used to be alive and working while the platform
 * saw a dead port and killed the instance — eighteen minutes of it, every deploy.
 *
 * The holder answers liveness with a 200 and is released the instant the real server is ready to bind,
 * so exactly one thing owns the port at any moment.
 */
async function main(): Promise<void> {
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 8080);
  const holder = await startLivenessHolder(port);

  try {
    await bootstrap({ releasePort: () => holder.close() });
  } catch (err) {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  }
}

if (isMainEntry(import.meta.url, process.argv[1])) {
  void main();
}
