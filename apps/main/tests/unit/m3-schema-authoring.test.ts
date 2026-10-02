import { describe, expect, test } from 'vitest';
import { defineCommand } from '@workspace/swastik';
import { toCommandDefinition } from '../../src/commands/module-command.js';
import {
  CoreRenderer,
  derivePageSections,
  type PageDataResult,
} from '../../src/rendering/core-renderer.js';

const identity = { surface: 'Dumby | Hello World', developer: 'Quixotic Mnemonics', version: '1.0.0' };

function greetingCommand() {
  return defineCommand({
    name: 'hello',
    description: 'Responds with a hello world greeting',
    pages: ['greeting'],
    permissions: { rbac: 'MEMBER' },
    execute: (_interaction, context): PageDataResult => ({
      page: 'greeting',
      data: {
        greeting: String(context.config['greeting'] ?? 'Hello, World!'),
        module: 'hello-world',
        version: '1.0.0',
      },
    }),
  });
}

describe('M3 row 11 — schema-declared authoring (UR-11)', () => {
  test('defineCommand requires a name and at least one page', () => {
    expect(greetingCommand().name).toBe('hello');
    expect(() => defineCommand({ name: '', description: 'x', pages: ['p'], execute: () => ({ page: 'p', data: {} }) })).toThrow(/name is required/u);
    expect(() => defineCommand({ name: 'x', description: 'x', pages: [], execute: () => ({ page: 'p', data: {} }) })).toThrow(/at least one page/u);
  });

  test('derivePageSections makes the primary value the content line', () => {
    const sections = derivePageSections('greeting', { greeting: 'Hello, World!', module: 'hello-world' });
    expect(sections[0]).toBe('Hello, World!');
    expect(sections[1]).toContain('module: hello-world');
  });

  test('the Renderer derives the whole frame from page data (no module-built components)', () => {
    const renderer = new CoreRenderer();
    const message = renderer.renderPage({
      ...identity,
      page: 'greeting',
      data: { greeting: 'Hello, World!', module: 'hello-world' },
    });
    expect(JSON.stringify(message)).toContain('Hello, World!');
    expect(JSON.stringify(message)).toContain('Quixotic Mnemonics');
  });

  test('normalizeHandlerResult accepts page data (the router path)', () => {
    const renderer = new CoreRenderer();
    const descriptor = renderer.normalizeHandlerResult(
      { page: 'greeting', data: { greeting: 'Hi' } },
      identity,
    );
    expect(descriptor.sections?.[0]).toBe('Hi');
  });

  test('toCommandDefinition bridges a declaration to a registry CommandDefinition', async () => {
    const renderer = new CoreRenderer();
    const def = toCommandDefinition(greetingCommand(), {
      moduleId: 'hello-world',
      identity,
      renderer,
      config: { greeting: 'Hello, World!' },
    });
    expect(def.data.name).toBe('hello');
    expect(def.moduleId).toBe('hello-world');
    expect(def.permissionDeclared).toBe(true);
    expect(def.permissions?.rbac).toBe('MEMBER');
    const result = (await def.execute({})) as PageDataResult;
    expect(result.page).toBe('greeting');
    expect(result.data['greeting']).toBe('Hello, World!');
  });
});
