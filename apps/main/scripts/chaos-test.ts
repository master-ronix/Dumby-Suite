/**
 * Chaos test (Cluster: Clay — outermost tier of the test pyramid).
 * Stops the Redis container out from under a running stack and confirms
 * the app degrades the way spec section 22 requires (in-memory rate-limit
 * fallback engages, liveness stays 200, readiness may flip) rather than
 * crashing. Requires a real `docker compose up` stack; cannot execute
 * inside the build sandbox (no Docker daemon there).
 */
import { execSync } from 'node:child_process';

const HEALTH_PORT = process.env.HEALTH_PORT ?? '8081';
const METRICS_PORT = process.env.METRICS_PORT ?? '8082';

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log('1. Confirm liveness is healthy before the fault is injected...');
  const before = await fetch(`http://localhost:${HEALTH_PORT}/health/liveness`);
  if (!before.ok) throw new Error('liveness must be healthy before starting the chaos test');

  console.log('2. Stop the redis container...');
  sh('docker compose stop redis');
  await sleep(3000);

  console.log('3. Liveness must stay 200 — a cache outage is not a process-health issue...');
  const duringOutage = await fetch(`http://localhost:${HEALTH_PORT}/health/liveness`);
  if (!duringOutage.ok) throw new Error('liveness must remain healthy during a Redis outage');

  console.log('4. The rate-limit fallback gauge should now read 1...');
  const metricsRes = await fetch(`http://localhost:${METRICS_PORT}/metrics`);
  const metricsBody = await metricsRes.text();
  if (!/dumby_rate_limit_fallback_active\s+1/.test(metricsBody)) {
    throw new Error('expected dumby_rate_limit_fallback_active to read 1 during the Redis outage');
  }

  console.log('5. Restart redis and confirm the fallback gauge returns to 0...');
  sh('docker compose start redis');
  await sleep(5000);
  const metricsAfter = await (await fetch(`http://localhost:${METRICS_PORT}/metrics`)).text();
  if (!/dumby_rate_limit_fallback_active\s+0/.test(metricsAfter)) {
    throw new Error('expected dumby_rate_limit_fallback_active to return to 0 after Redis recovers');
  }

  console.log('\nChaos scenario passed: the app degraded gracefully and recovered.');
}

main().catch((err) => {
  console.error('Chaos scenario FAILED:', err);
  process.exit(1);
});
