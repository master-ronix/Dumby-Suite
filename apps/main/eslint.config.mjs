import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
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

      // Pino is the sole logger (blueprint §5.10 / directive Part 2). Direct console
      // use is banned; the allow-listed entrypoints (src/entry, src/cli, scripts,
      // tests) are exempted in the block below.
      'no-console': 'error',

      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'discord.js',
              importNames: ['EmbedBuilder', 'MessageEmbed'],
              message:
                'Classic embeds are banned (ADR-001): all presentation is renderer-issued ' +
                'Components v2. Use the core Renderer via render descriptors.',
            },
          ],
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

      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Direct process.env access is forbidden. Inject ConfigService via the DI container ' +
            'or use parseEnv() in src/config/env.schema.ts. ' +
            'Only src/config/env.schema.ts and src/entry/*.ts are allowed to read process.env directly.',
        },
        {
          selector:
            "NewExpression[callee.name='EmbedBuilder'], NewExpression[callee.name='MessageEmbed']",
          message:
            'Classic embed construction is banned (ADR-001): all presentation is renderer-issued ' +
            'Components v2.',
        },
      ],

      'import/no-cycle': ['error', { maxDepth: 5 }],
    },
  },
  // NOTE: the module-boundary rules for feature modules live in
  // packages/modules/eslint.config.mjs — ADR-005 moved module storage out of
  // `src/modules/` into per-tier volumes, so any block scoped to `src/modules/**`
  // here would silently match nothing.
  {
    files: ['src/commands/**/*.ts'],
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
  {
    files: ['src/db/repositories/**/*.ts'],
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
  {
    files: [
      'src/config/env.schema.ts',
      'src/entry/**/*.ts',
      'src/cli/**/*.ts',
      'src/bootstrap/bootstrap.ts',
      'src/db/knexfile.ts',
      'scripts/**/*.ts',
      'tests/**/*.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
      'no-console': 'off',
    },
  },
];
