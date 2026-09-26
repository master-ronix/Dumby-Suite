const HEALTH_PORT = process.env.HEALTH_PORT ?? '8081';
const URL = `http://localhost:${HEALTH_PORT}/health/liveness`;
const TOTAL_REQUESTS = Number(process.env.LOAD_TEST_REQUESTS ?? 500);
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 20);

async function timedRequest(): Promise<{ ok: boolean; ms: number }> {
  const start = performance.now();
  try {
    const res = await fetch(URL);
    return { ok: res.ok, ms: performance.now() - start };
  } catch {
    return { ok: false, ms: performance.now() - start };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

async function main(): Promise<void> {
  const results: Array<{ ok: boolean; ms: number }> = [];
  let inFlight = 0;
  let launched = 0;

  await new Promise<void>((resolve) => {
    const launchNext = (): void => {
      if (launched >= TOTAL_REQUESTS && inFlight === 0) {
        resolve();
        return;
      }
      while (inFlight < CONCURRENCY && launched < TOTAL_REQUESTS) {
        launched += 1;
        inFlight += 1;
        void timedRequest().then((r) => {
          results.push(r);
          inFlight -= 1;
          launchNext();
        });
      }
    };
    launchNext();
  });

  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const errorCount = results.filter((r) => !r.ok).length;

  console.log(`Requests: ${results.length}, concurrency: ${CONCURRENCY}`);
  console.log(`Errors: ${errorCount} (${((errorCount / results.length) * 100).toFixed(2)}%)`);
  console.log(`p50: ${percentile(latencies, 50).toFixed(1)}ms`);
  console.log(`p95: ${percentile(latencies, 95).toFixed(1)}ms`);
  console.log(`p99: ${percentile(latencies, 99).toFixed(1)}ms`);

  if (errorCount / results.length > 0.01) {
    console.error('Error rate exceeded 1% threshold.');
    process.exit(1);
  }
}

void main();
