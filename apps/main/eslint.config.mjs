// ESLint flat config (ESLint 9). Encodes five architecture invariants as
// build failures rather than review discipline (blueprint.md §16.4 /
// directive.md §15–§19):
//
//  Rule 1 — no-cross-module-relative-import
//     Modules may not deep-import sibling module internals via relative paths.
//     Cross-module reads must go through a *.forCrossModuleRead accessor.
//
//  Rule 2 — no-direct-process-env
//     Direct process.env access is banned everywhere; all config must be
//     injected via the DI container (ConfigService) or the Zod env schema at
//     the single entry-point boundary (src/config/env.schema.ts).
//
//  Rule 3 — no-repository-in-command
//     Command handlers (src/modules/*/commands/**) may not import repository
//     files directly — they must go through a service layer.
//
//  Rule 4 — no-event-emit-in-repository
//     Repository files may not import the InternalEventBus and call emit().
//     Event emission belongs in the service layer.
//
//  Rule 5 — require-eventsCatalog-entry (enforced via manifest validation at
//     bootstrap Stage 11, not an ESLint rule — see src/modules/manifest.schema.ts).
//
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.agent/**'],
  },
  // ── Base rules for all TS source ────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.tests.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',

      // Rule 1 — no-cross-module-relative-import (outer guard).
      // Blocks any file outside src/modules/* from reaching into a module's
      // internal folder using a relative path.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/modules/*/!(forCrossModuleRead|manifest)*'],
              message:
                'Cross-module imports are forbidden except through a declared ' +
                '*.forCrossModuleRead accessor or the module manifest. See Cluster Bridge.',
            },
          ],
        },
      ],

      // Rule 2 — no-direct-process-env.
      // Config must flow through ConfigService / parseEnv(), not bare process.env.
      // Exempted: src/config/env.schema.ts (the single allowed boundary file)
      //           src/entry/*.ts (boot files that call parseEnv before DI exists)
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Direct process.env access is forbidden. Inject ConfigService via the DI container ' +
            'or use parseEnv() in src/config/env.schema.ts. ' +
            'Only src/config/env.schema.ts and src/entry/*.ts are allowed to read process.env directly.',
        },
      ],

      // Cycle detection across arbitrary import depth.
      'import/no-cycle': ['error', { maxDepth: 5 }],
    },
  },
  // ── Rule 1 inner guard: module-to-module isolation ───────────────────────────
  {
    files: ['src/modules/*/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Disallow "../other-module-name/..." from inside one module
              // reaching into a sibling module directory, including the
              // exempted forCrossModuleRead suffix — those must be consumed
              // by the caller, not reached into from within the providing module.
              group: ['../*/!(forCrossModuleRead)*', '../../modules/*/**'],
              message: 'Modules may not deep-import sibling module internals directly.',
            },
          ],
        },
      ],
    },
  },
  // ── Rule 3 — no-repository-in-command ────────────────────────────────────────
  {
    files: ['src/modules/*/commands/**/*.ts', 'src/commands/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/repository', '**/repository.ts', '**/*.repository', '**/*.repository.ts'],
              message:
                'Command handlers must not import repositories directly. ' +
                'Use a service layer — commands call services, services call repositories (three-layer rule).',
            },
          ],
        },
      ],
    },
  },
  // ── Rule 4 — no-event-emit-in-repository ─────────────────────────────────────
  {
    files: [
      'src/modules/*/repository.ts',
      'src/modules/*/*.repository.ts',
      'src/db/repositories/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/event-bus', '**/event-bus.ts', '**/InternalEventBus*'],
              message:
                'Repositories must not emit events. Move event emission to the service layer.',
            },
          ],
        },
      ],
    },
  },
  // ── Exemptions — boundary files allowed to touch process.env directly ────────
  // The rule of thumb: if the file runs BEFORE the DI container exists, or if it
  // is a Knex migration config / dev script / test helper, process.env is allowed.
  // Everything else must go through ConfigService.
  {
    files: [
      // The single schema file that defines and validates the env shape.
      'src/config/env.schema.ts',
      // Entry-point bootstrappers that run before DI exists.
      'src/entry/**/*.ts',
      // bootstrap.ts calls parseEnv(process.env) — that IS the boundary.
      'src/bootstrap/bootstrap.ts',
      // Knex config file is loaded by the Knex CLI before any DI exists.
      'src/db/knexfile.ts',
      // Dev/CI scripts (chaos tests, load tests, smoke tests, etc.) run
      // outside the application container entirely.
      'scripts/**/*.ts',
      // Test files may set process.env as part of test fixtures.
      'tests/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
