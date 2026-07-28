import { defineConfig } from 'vitest/config';

/**
 * Integration tier config (Cluster: Masters). These tests talk to a real
 * Postgres + Redis (via docker-compose.yml), so they run with a longer
 * timeout and strictly sequentially per file to avoid cross-test data
 * collisions on shared tables.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
    globals: false,
  },
});
