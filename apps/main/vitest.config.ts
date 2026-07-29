import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**', 'tests/e2e/**', 'tests/smoke/**', 'tests/load/**', 'tests/chaos/**'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/entry/**',
        'src/monetization/**',
        'src/**/*.d.ts',
        // Illustrative catalog module scaffolds — require live DB/queue to execute.
        // These are explicitly out of scope for unit testing (master-prompt.md ADR 004:
        // "22 catalog modules: no commands, no schemas, no services — skeletons only").
        'src/modules/*/eraser.ts',
        'src/modules/*/exporter.ts',
        'src/modules/*/job.ts',
        'src/modules/*/repository.ts',
        // Database layer — requires live PostgreSQL to execute.
        'src/db/migrations/**',
        'src/db/client.ts',
        'src/db/knexfile.ts',
        'src/db/repositories/**',
        // Module registry list — re-exports only, no logic.
        'src/modules/register-all.ts',
        // Template — illustrative scaffold, not executable.
        'src/modules/_template/**',
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
