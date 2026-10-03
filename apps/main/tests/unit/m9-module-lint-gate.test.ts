import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

/**
 * Finding #1 — the module-boundary architecture rules in `apps/main/eslint.config.mjs` are scoped
 * to `src/modules/*`, which the M2 merge removed, so they silently matched nothing while CI's lint
 * gate still passed. The modules now live in `packages/modules/*`, so the boundary rules must live
 * there and be gated. This asserts the new config's shape and that CI runs it.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

interface ConfigBlock {
  files?: string[];
  rules?: Record<string, unknown>;
}

async function loadModuleLintConfig(): Promise<ConfigBlock[]> {
  const mod = (await import(`${repoRoot}/packages/modules/eslint.config.mjs`)) as {
    default: ConfigBlock[];
  };
  return mod.default;
}

describe('M9 — module architecture lint gate (finding #1)', () => {
  test('the config targets packages/modules, not the removed src/modules', async () => {
    const blocks = await loadModuleLintConfig();
    const fileGlobs = blocks.flatMap((block) => block.files ?? []);
    expect(fileGlobs.some((glob) => glob.startsWith('packages/modules/'))).toBe(true);
    expect(fileGlobs.some((glob) => glob.includes('src/modules'))).toBe(false);
  });

  test('a cross-module block exists per first-party module, excluding the module itself', async () => {
    const blocks = await loadModuleLintConfig();
    const baseBlocks = blocks.filter(
      (block) => block.files?.length === 1 && /^packages\/modules\/[^/*]+\/\*\*\/\*\.ts$/.test(block.files[0]!),
    );
    expect(baseBlocks.length).toBeGreaterThanOrEqual(8);

    for (const block of baseBlocks) {
      const glob = block.files![0]!;
      const selfDir = glob.split('/')[2]!;
      const restriction = block.rules?.['no-restricted-imports'] as [
        string,
        { patterns: Array<{ group: string[] }> },
      ];
      const crossModule = restriction[1].patterns[0]!.group;
      expect(crossModule.length).toBeGreaterThan(0);
      expect(crossModule).not.toContain(`@workspace/module-${selfDir}/*`);
    }
  });

  test('the three-layer and repository rules cover the .js import specifier', async () => {
    const blocks = await loadModuleLintConfig();
    const allPatterns = blocks
      .flatMap((block) => {
        const restriction = block.rules?.['no-restricted-imports'] as
          | [string, { patterns: Array<{ group: string[] }> }]
          | undefined;
        return restriction?.[1].patterns.flatMap((pattern) => pattern.group) ?? [];
      })
      .join('\n');
    expect(allPatterns).toContain('**/*.repository.js');
    expect(allPatterns).toContain('**/event-bus.js');
  });

  test('CI gates the module lint, and the root script exists', () => {
    const ci = readFileSync(resolve(repoRoot, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('pnpm run lint:modules');

    const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['lint:modules']).toContain('packages/modules/eslint.config.mjs');
  });
});
