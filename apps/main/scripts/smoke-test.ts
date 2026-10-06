const API_PORT = process.env.API_PORT ?? '8080';
const HEALTH_PORT = process.env.HEALTH_PORT ?? '8081';
const METRICS_PORT = process.env.METRICS_PORT ?? '8082';

interface Check {
  name: string;
  run: () => Promise<void>;
}

const checks: Check[] = [
  {
    name: 'liveness',
    run: async () => {
      const res = await fetch(`http://localhost:${HEALTH_PORT}/health/liveness`);
      if (!res.ok) throw new Error(`liveness returned ${res.status}`);
    },
  },
  {
    name: 'readiness',
    run: async () => {
      const res = await fetch(`http://localhost:${HEALTH_PORT}/health/readiness`);
      if (!res.ok) throw new Error(`readiness returned ${res.status}`);
    },
  },
  {
    name: 'metrics endpoint serves Prometheus text',
    run: async () => {
      const res = await fetch(`http://localhost:${METRICS_PORT}/metrics`);
      if (!res.ok) throw new Error(`metrics returned ${res.status}`);
      const body = await res.text();
      if (!body.includes('dumby_')) throw new Error('metrics body missing dumby_ series');
    },
  },
  {
    name: 'GET /api/info responds',
    run: async () => {
      const res = await fetch(`http://localhost:${API_PORT}/api/info`);
      if (!res.ok) throw new Error(`/api/info returned ${res.status}`);
    },
  },
];

async function main(): Promise<void> {
  let failures = 0;
  for (const check of checks) {
    try {
      await check.run();
      console.log(`PASS: ${check.name}`);
    } catch (err) {
      failures += 1;
      console.error(`FAIL: ${check.name} — ${(err as Error).message}`);
    }
  }
  if (failures > 0) {
    console.error(`\n${failures}/${checks.length} smoke checks failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} smoke checks passed.`);
}

void main();
