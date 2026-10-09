import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
import { toCommandDefinition } from '../../src/commands/module-command.js';
import { CoreRenderer } from '../../src/rendering/core-renderer.js';
import { commands } from '../../../../packages/modules/hello-world/src/index.js';

const manifestPath = fileURLToPath(
  new URL('../../../../packages/modules/hello-world/manifest.json', import.meta.url),
);
const identity = {
  surface: 'Hello World',
  developer: 'Quixotic Mnemonics',
  version: '1.0.0',
};

describe('MR-1 — hello-world module (Standard tier)', () => {
  test('the manifest parses and declares the /hello command', () => {
    const manifest = parseManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
    expect(manifest.name).toBe('hello-world');
    expect(manifest.tier).toBe('standard');
    // hello-world is Standard tier, and marketplaceCategory is forbidden outside Marketplace.
    expect(manifest.marketplaceCategory).toBeUndefined();
    expect(manifest.visibility).toBe('public');
    expect(manifest.releaseStatus).toBe('public');
    expect(manifest.commands.map((c) => c.name)).toEqual(['hello']);
    expect(manifest.config['greeting']).toBe('Hello, World!');
  });

  test('the module exports its schema-declared command', () => {
    expect(commands).toHaveLength(1);
    const first = commands[0];
    expect(first?.name).toBe('hello');
    expect(first?.pages).toEqual(['greeting']);
  });

  test('the command renders through the Renderer (no module-built components)', async () => {
    const renderer = new CoreRenderer();
    const declaration = commands[0];
    if (declaration === undefined) throw new Error('no command declared');
    const def = toCommandDefinition(declaration, {
      moduleId: 'hello-world',
      identity,
      renderer,
      config: { greeting: 'Hello, World!' },
    });
    const pageData = await def.execute({}, { config: { greeting: 'Hello, World!' }, data: {} });
    const descriptor = renderer.normalizeHandlerResult(pageData, identity);
    const message = renderer.render(descriptor);
    const serialized = JSON.stringify(message);
    expect(serialized).toContain('Hello, World!');
    expect(serialized).toContain('Quixotic Mnemonics');
  });
});
