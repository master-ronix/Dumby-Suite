import { describe, expect, test, vi } from 'vitest';
import { Container } from '../../src/di/container.js';
import { CORE_TOKENS } from '../../src/di/tokens.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { ModuleRegistry } from '../../src/modules/registry.js';
import { ModuleLoader } from '../../src/modules/loader.js';
import { registerFirstPartyModules } from '../../src/modules/first-party.js';
import type { Logger } from '../../src/logging/logger.js';

function logger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

describe('first-party shipped modules', () => {
  test('registers health and hello-world modules for bootstrap discovery', () => {
    const registry = new ModuleRegistry();

    expect(registerFirstPartyModules(registry)).toStrictEqual(['health', 'hello-world']);
    expect(registry.get('health')?.manifest.tier).toBe('core');
    expect(registry.get('hello-world')?.manifest.tier).toBe('standard');
  });

  test('module onLoad hooks register their slash commands', async () => {
    const container = new Container();
    const commandRegistry = new CommandRegistry();
    const moduleRegistry = new ModuleRegistry();
    container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
    registerFirstPartyModules(moduleRegistry);

    const loader = new ModuleLoader(moduleRegistry, container, logger());
    loader.validateAll();
    await loader.loadAll();

    expect(commandRegistry.has('health')).toBe(true);
    expect(commandRegistry.has('hello')).toBe(true);
    expect(commandRegistry.get('hello')?.permissionDeclared).toBe(true);
  });

  test('/hello replies with the specified Components V2 payload', async () => {
    const container = new Container();
    const commandRegistry = new CommandRegistry();
    const moduleRegistry = new ModuleRegistry();
    container.registerValue(CORE_TOKENS.CommandRegistry, commandRegistry);
    registerFirstPartyModules(moduleRegistry);
    await new ModuleLoader(moduleRegistry, container, logger()).loadAll();

    const reply = vi.fn().mockResolvedValue(undefined);
    await commandRegistry.get('hello')?.execute({ reply });

    expect(reply).toHaveBeenCalledWith({
      flags: 32768,
      components: [
        {
          type: 10,
          content: '# Hello, World!\n\nThis is a test response from the hello-world module.',
        },
        {
          type: 17,
          components: [
            {
              type: 10,
              content: 'Dumby | Hello World\n-# Developed by Quixotic Mnemonics v1.0.0',
            },
          ],
        },
      ],
    });
  });
});
