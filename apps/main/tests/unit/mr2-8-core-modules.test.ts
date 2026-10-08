import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { CommandDeclaration } from '@workspace/swastik';
import { parseManifest } from '../../src/module-system/manifest.schema.js';
import { toCommandDefinition } from '../../src/commands/module-command.js';
import { CoreRenderer } from '../../src/rendering/core-renderer.js';
import { commands as healthCommands } from '../../../../packages/modules/health/src/index.js';
import { commands as browseCommands } from '../../../../packages/modules/browse/src/index.js';
import { commands as queueCommands } from '../../../../packages/modules/queue/src/index.js';
import { commands as personaCommands } from '../../../../packages/modules/persona/src/index.js';
import { commands as permitCommands } from '../../../../packages/modules/permit/src/index.js';
import { commands as modulesCommands } from '../../../../packages/modules/modules/src/index.js';
import { commands as dashboardCommands } from '../../../../packages/modules/dashboard/src/index.js';

const CASES: Array<{ slug: string; command: string; declared: readonly CommandDeclaration[] }> = [
  { slug: 'health', command: 'health', declared: healthCommands },
  { slug: 'browse', command: 'browse', declared: browseCommands },
  { slug: 'queue', command: 'queue', declared: queueCommands },
  { slug: 'persona', command: 'persona', declared: personaCommands },
  { slug: 'permit', command: 'permit', declared: permitCommands },
  { slug: 'modules', command: 'modules', declared: modulesCommands },
  { slug: 'dashboard', command: 'dashboard', declared: dashboardCommands },
];

function identity(slug: string) {
  return { surface: slug, developer: 'Quixotic Mnemonics', version: '1.0.0' };
}

describe('MR-2…MR-8 — Core-tier modules (single-command each)', () => {
  for (const { slug, command, declared } of CASES) {
    test(`${slug}: the manifest is a valid Core manifest declaring /${command}`, () => {
      const path = fileURLToPath(
        new URL(`../../../../packages/modules/${slug}/manifest.json`, import.meta.url),
      );
      const manifest = parseManifest(JSON.parse(readFileSync(path, 'utf8')));
      expect(manifest.name).toBe(slug);
      expect(manifest.tier).toBe('core');
      expect(manifest.commands.map((c) => c.name)).toEqual([command]);
      expect(manifest.locales).toContain('en-US');
    });

    test(`${slug}: exports a schema-declared /${command} that renders through the Renderer`, async () => {
      expect(declared).toHaveLength(1);
      const declaration = declared[0];
      if (declaration === undefined) throw new Error(`${slug} declares no command`);
      expect(declaration.name).toBe(command);

      const renderer = new CoreRenderer();
      const def = toCommandDefinition(declaration, {
        moduleId: slug,
        identity: identity(slug),
        renderer,
      });
      expect(def.data.name).toBe(command);
      const pageData = await def.execute({});
      const message = renderer.render(renderer.normalizeHandlerResult(pageData, identity(slug)));
      expect(JSON.stringify(message)).toContain('Quixotic Mnemonics');
    });
  }
});
