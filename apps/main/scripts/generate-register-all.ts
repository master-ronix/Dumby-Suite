import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULES } from './scaffold-module.js';

function pascalCase(slug: string): string {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

const importLines = MODULES.map((m) => {
  const name = pascalCase(m.slug);
  return `import { ${name}Manifest } from './${m.slug}/manifest.js';\nimport * as ${name}Lifecycle from './${m.slug}/index.js';`;
}).join('\n');

const registerLines = MODULES.map((m) => {
  const name = pascalCase(m.slug);
  return `  registry.register({\n    manifest: ${name}Manifest,\n    onLoad: ${name}Lifecycle.onLoad,\n    onReady: ${name}Lifecycle.onReady,\n    onUnload: ${name}Lifecycle.onUnload,\n  });`;
}).join('\n');

const content = `import type { ModuleRegistry } from './registry.js';
${importLines}

/**
 * Stage 10 MODULE_DISCOVER: registers all 22 illustrative module
 * skeletons. Generated from scripts/scaffold-module.ts's MODULES array by
 * scripts/generate-register-all.ts — regenerate if the module list
 * changes rather than hand-editing this file.
 */
export function registerAllModules(registry: ModuleRegistry): void {
${registerLines}
}
`;

const __filenamePath = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filenamePath), '..');
writeFileSync(path.join(REPO_ROOT, 'src', 'modules', 'register-all.ts'), content, 'utf8');
console.log('wrote src/modules/register-all.ts');
