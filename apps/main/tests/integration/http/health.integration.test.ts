import { describe, it, expect } from 'vitest';

const HEALTH_PORT = process.env.HEALTH_PORT ?? '8081';
const BASE = `http://localhost:${HEALTH_PORT}`;

describe('health probes against a live server', () => {
  it('GET /health/liveness returns 200 once the process is up', async () => {
    const res = await fetch(`${BASE}/health/liveness`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('live');
  });

  it('GET /health/readiness returns 200 once bootstrap has fully completed', async () => {
    const res = await fetch(`${BASE}/health/readiness`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ready');
  });
});
