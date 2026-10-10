import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const srcRoot = path.join(appRoot, 'src');
const commandsRoot = path.join(srcRoot, 'commands');

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath);
      return [fullPath];
    }),
  );
  return nested.flat();
}

describe('unified command tree', () => {
  it('keeps command-system code in the single canonical src/commands tree', async () => {
    expect(existsSync(commandsRoot)).toBe(true);
    expect(existsSync(path.join(srcRoot, 'core', 'commands'))).toBe(false);

    const commandFiles = (await listFiles(commandsRoot))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => path.relative(commandsRoot, file).replaceAll(path.sep, '/'))
      .sort();

    expect(commandFiles).toEqual([
      'bccm-batch-push-store.ts',
      'bccm-batch-push.ts',
      'bccm-effects.ts',
      'collision-resolution.ts',
      'command-ceiling.ts',
      'command-deployer.ts',
      'command-registry.ts',
      'command-renames.ts',
      'command-router.ts',
      'module-command.ts',
    ]);
  });

  it('has exactly one CommandRouter implementation', async () => {
    const files = (await listFiles(srcRoot)).filter((file) => file.endsWith('.ts'));
    const routerImplementations: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (/\bexport\s+class\s+CommandRouter\b/.test(source)) {
        routerImplementations.push(path.relative(srcRoot, file).replaceAll(path.sep, '/'));
      }
    }

    expect(routerImplementations).toEqual(['commands/command-router.ts']);
  });

  it('has no source or unit-test imports from retired command trees', async () => {
    const roots = [srcRoot, path.join(appRoot, 'tests', 'unit')];
    const files = (await Promise.all(roots.map((root) => listFiles(root))))
      .flat()
      .filter((file) => file.endsWith('.ts'));
    const retiredCoreTree = ['src', 'core', 'commands'].join('/');
    const retiredRelativeCoreTree = ['..', 'core', 'commands'].join('/');
    const retiredModuleImport = ['..', '..', 'src', 'modules'].join('/');
    const staleReferences: string[] = [];

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (
        source.includes(retiredCoreTree) ||
        source.includes(retiredRelativeCoreTree) ||
        source.includes(retiredModuleImport)
      ) {
        staleReferences.push(path.relative(appRoot, file).replaceAll(path.sep, '/'));
      }
    }

    expect(staleReferences).toEqual([]);
  });
});
