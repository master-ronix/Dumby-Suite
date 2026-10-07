import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    exclude: [
      'tests/integration/**',
      'tests/e2e/**',
      'tests/smoke/**',
      'tests/load/**',
      'tests/chaos/**',
    ],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/entry/**',
        'src/monetization/**',
        'src/**/*.d.ts',
        'src/db/migrations/**',
        'src/db/client.ts',
        'src/db/knexfile.ts',
        'src/db/repositories/**',
        'src/shared/testing/**',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
});
