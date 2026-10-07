// Architecture rules for the first-party modules (packages/modules/*).
//
// apps/main/eslint.config.mjs scopes its module-boundary rules to `src/modules/*`, which the M2
// merge removed — so those rules silently matched nothing while the CI lint gate still passed.
// The modules live here now, so the boundary rules live here too.
//
// Flat config replaces a rule wholesale when a later block matches the same file, so each block
// carries the *union* of the patterns that apply to it. Blocks are ordered least- to
// most-specific: `**/*.ts` (base) -> `commands/**` -> `repositories/**`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';

const here = dirname(fileURLToPath(import.meta.url));

const moduleDirs = readdirSync(here, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name !== 'node_modules' &&
      entry.name !== '_template' &&
      existsSync(join(here, entry.name, 'package.json')),
  )
  .map((entry) => entry.name);

const packageNameOf = (dir) =>
  JSON.parse(readFileSync(join(here, dir, 'package.json'), 'utf8')).name;

const EMBED_BAN = {
  name: 'discord.js',
  importNames: ['EmbedBuilder', 'MessageEmbed'],
  message:
    'Classic embeds are banned (ADR-001): all presentation is renderer-issued Components v2. ' +
    'Use the core Renderer via render descriptors.',
};

const REPOSITORY_GROUP = {
  group: [
    '**/repository',
    '**/repository.ts',
    '**/repository.js',
    '**/*.repository',
    '**/*.repository.ts',
    '**/*.repository.js',
  ],
  message:
    'Command handlers must not import repositories directly. Use a service layer — commands call ' +
    'services, services call repositories (three-layer rule).',
};

const EVENT_BUS_GROUP = {
  group: ['**/event-bus', '**/event-bus.ts', '**/event-bus.js', '**/InternalEventBus*'],
  message: 'Repositories must not emit events. Move event emission to the service layer.',
};

const crossModuleGroup = (selfPackageName) => ({
  group: moduleDirs
    .map(packageNameOf)
    .filter((name) => name !== selfPackageName)
    .map((name) => `${name}/*`),
  message:
    'Cross-module imports are forbidden except through a declared *.forCrossModuleRead accessor ' +
    'or the module manifest. See Cluster Bridge.',
});

const restrictedImports = (patterns) => [
  'error',
  { paths: [EMBED_BAN], patterns },
];

const perModuleBlocks = moduleDirs.flatMap((dir) => {
  const crossModule = crossModuleGroup(packageNameOf(dir));
  return [
    {
      files: [`packages/modules/${dir}/**/*.ts`],
      rules: { 'no-restricted-imports': restrictedImports([crossModule]) },
    },
    {
      files: [`packages/modules/${dir}/commands/**/*.ts`],
      rules: { 'no-restricted-imports': restrictedImports([crossModule, REPOSITORY_GROUP]) },
    },
    {
      files: [
        `packages/modules/${dir}/repositories/**/*.ts`,
        `packages/modules/${dir}/*.repository.ts`,
      ],
      rules: { 'no-restricted-imports': restrictedImports([crossModule, EVENT_BUS_GROUP]) },
    },
  ];
});

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] },
  {
    files: ['packages/modules/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module' },
    },
    rules: {
      // Pino is the sole logger; feature modules must not write to console directly.
      'no-console': 'error',
      'no-restricted-imports': restrictedImports([]),
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            'Direct process.env access is forbidden. Inject ConfigService via the DI container ' +
            'or use parseEnv() in apps/main/src/config/env.schema.ts.',
        },
        {
          selector:
            "NewExpression[callee.name='EmbedBuilder'], NewExpression[callee.name='MessageEmbed']",
          message:
            'Classic embed construction is banned (ADR-001): all presentation is renderer-issued ' +
            'Components v2.',
        },
      ],
    },
  },
  ...perModuleBlocks,
];
