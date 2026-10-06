import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { moduleManifestSchema } from '@workspace/swastik/manifest';
import { repoRoot } from '../spec-utils.js';
/**
 * ACC-MOD-0011-1 — "`manifest.ts` exports an object that validates against the shared manifest Zod
 * schema at Stage 11."
 *
 * Authority: docs/spec/modules/module-anatomy-manifest.md (SPEC-03-MODULES), acceptance block. Every
 * shipped first-party package must validate against the one shared schema the bot's Stage 11
 * validator uses.
 */
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const modulesDir = `${repoRoot}packages/modules`;

function packageSlugs(): string[] {
  return readdirSync(modulesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

describe('ACC-MOD-0011-1 — every shipped manifest validates against the shared schema', () => {
  for (const slug of packageSlugs()) {
    it(`${slug}/manifest.json validates at Stage 11`, () => {
      const manifest: unknown = JSON.parse(
        readFileSync(join(modulesDir, slug, 'manifest.json'), 'utf8'),
      );
      const parsed = moduleManifestSchema.safeParse(manifest);
      if (!parsed.success) {
        throw new Error(
          `${slug} failed Stage 11 validation:\n${parsed.error.issues
            .map((i) => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n')}`,
        );
      }
      expect(parsed.success).toBe(true);
    });
  }

  it('the manifest name always matches its directory', () => {
    for (const slug of packageSlugs()) {
      const manifest = JSON.parse(
        readFileSync(join(modulesDir, slug, 'manifest.json'), 'utf8'),
      ) as {
        name: string;
      };
      expect(manifest.name).toBe(slug);
    }
  });
});
