import { describe, expect, test, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Logger } from '../../src/logging/logger.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter, CommandScopeDeniedError } from '../../src/commands/command-router.js';

function makeLogger() {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
}

function makeInteraction(name: string) {
  return {
    commandName: name,
    user: { id: 'u1' },
    guildId: 'g1',
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function textContents(payload: unknown): string {
  const msg = payload as { components?: Array<{ components?: unknown[] }> } | undefined;
  if (msg === undefined || !Array.isArray(msg.components)) return '';
  const out: string[] = [];
  const walk = (components: unknown[]): void => {
    for (const component of components) {
      const comp = component as { type?: number; content?: string; components?: unknown[] };
      if (comp.type === 10 && typeof comp.content === 'string') out.push(comp.content);
      if (Array.isArray(comp.components)) walk(comp.components);
    }
  };
  for (const component of msg.components) {
    const comp = component as { components?: unknown[] };
    if (Array.isArray(comp.components)) walk(comp.components);
    else walk([component]);
  }
  return out.join('\n');
}

describe('M3 gate — embed ban (ADR-001)', () => {
  test('no file in src/ instantiates or imports a classic embed', () => {
    const srcDir = fileURLToPath(new URL('../../src', import.meta.url));
    const offenders = readdirSync(srcDir, { recursive: true, encoding: 'utf8' }).filter((path) => {
      if (!path.endsWith('.ts')) return false;
      const source = readFileSync(join(srcDir, path), 'utf8');
      return /\bEmbedBuilder\b|\bMessageEmbed\b/.test(source);
    });
    expect(offenders).toEqual([]);
  });
});

describe('M3 gate — absolute DM prohibition (ADR-002)', () => {
  test('a DM-originated command is rejected without any literal reply or edit', async () => {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('health', 'core');
    reg.register({
      data: { name: 'health', description: 'H' },
      execute: handler,
      moduleId: 'health',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('health');
    interaction.guildId = null;

    await expect(router.dispatch(interaction)).rejects.toBeInstanceOf(CommandScopeDeniedError);
    expect(handler).not.toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
    expect(interaction.editReply).not.toHaveBeenCalled();
  });
});

describe('M3 gate — buffer-then-render dispatch boundary', () => {
  test('a handler returning a hand-built message payload is surfaced as a MODULE_ERROR notice', async () => {
    const reg = new CommandRegistry();
    reg.register({
      data: { name: 'raw', description: 'R' },
      execute: async () => ({ content: 'not allowed', components: [] }),
      moduleId: 'core',
    });
    const logger = makeLogger() as unknown as Logger;
    const router = new CommandRouter(reg, logger);
    const interaction = makeInteraction('raw');

    await router.dispatch(interaction);

    const edits = interaction.editReply.mock.calls;
    expect(edits).toHaveLength(1);
    const reason = textContents(edits[0]?.[0] as unknown);
    expect(reason).toContain('reason: MODULE_ERROR');
    expect((edits[0]?.[0] as { flags?: number }).flags).toBe(32768);
  });
});
