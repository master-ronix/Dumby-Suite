import { execSync } from 'node:child_process';

const HEALTH_PORT = process.env.HEALTH_PORT ?? '8081';
const METRICS_PORT = process.env.METRICS_PORT ?? '8082';
const API_PORT = process.env.API_PORT ?? '8080';

function run(label: string, cmd: string): void {
  console.log(`\n=== ${label} ===`);
  execSync(cmd, { stdio: 'inherit' });
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();

  while (true) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function main(): Promise<void> {
  run('pnpm install', 'pnpm install');
  run('build', 'pnpm build');
  run('typecheck', 'pnpm typecheck');
  run('lint', 'pnpm lint');
  run('unit tests', 'pnpm test:unit');
  run('docker compose up state services', 'docker compose up -d --build postgres redis');
  run('migrate', 'pnpm migrate');
  run('docker compose up Swastik', 'docker compose up -d --build swastik');

  console.log('\n=== waiting for Swastik ===');
  await waitFor(`http://localhost:${process.env.SWASTIK_PORT ?? '8085'}/swastik/status`, 60_000);
  console.log('Swastik status endpoint returned 200.');

  run('docker compose up runtime', 'docker compose up -d --build app');

  console.log('\n=== waiting for health endpoints ===');
  await waitFor(`http://localhost:${HEALTH_PORT}/health/liveness`, 60_000);
  await waitFor(`http://localhost:${HEALTH_PORT}/health/startup`, 60_000);
  await waitFor(`http://localhost:${HEALTH_PORT}/health/readiness`, 60_000);
  console.log('All three health probes returned 200.');
  run('seed', 'pnpm seed');

  console.log('\n=== metrics endpoint ===');
  const metricsRes = await fetch(`http://localhost:${METRICS_PORT}/metrics`);
  if (!metricsRes.ok) throw new Error(`GET /metrics returned ${metricsRes.status}`);
  const metricsBody = await metricsRes.text();
  if (!metricsBody.includes('dumby_'))
    throw new Error('metrics body missing expected dumby_ prefixed series');
  console.log('Metrics endpoint OK.');

  console.log('\n=== representative API checks ===');
  const infoRes = await fetch(`http://localhost:${API_PORT}/api/info`);
  if (!infoRes.ok) throw new Error(`GET /api/info returned ${infoRes.status}`);
  console.log('GET /api/info OK.');

  console.log('\nAll verification steps completed successfully.');
}

main().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
