import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'src/core/commands/__tests__/**/*.test.ts'],
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
        // Database layer — requires live PostgreSQL to execute.
        'src/db/migrations/**',
        'src/db/client.ts',
        'src/db/knexfile.ts',
        'src/db/repositories/**',
        // Module registry list — re-exports only, no logic.
        'src/modules/register-all.ts',
        // Testing helpers — not production code.
        'src/shared/testing/**',
      ],
      thresholds: {
        // Per-layer floors enforced in CI (directive.md §46 item 59).
        // Core: 85% statements / 80% branches
        // Full threshold enforcement is done per-directory in ci.yml.
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
});
