import { defineConfig } from 'vitest/config';

/**
 * The corpus defines a change as complete only when its `acceptance` block's test passes
 * (docs/prompts/entry.md rule 6). Those tests are named `*.spec.ts` and live under
 * `tests/integration/` and `tests/arch/`, so both the naming and the arch tree are included here.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    fileParallelism: false,
    globals: false,
  },
});
