import { defineConfig } from 'vitest/config';

/** The flow suite: real bootstrap → wiring → shutdown, booted against embedded PostgreSQL. */
export default defineConfig({
  test: {
    include: ['tests/flow/**/*.flow.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    globals: false,
  },
});
