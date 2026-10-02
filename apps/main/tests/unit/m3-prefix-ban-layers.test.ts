import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { computeIntentsBitfield } from '../../src/discord/client-builder.js';
import { ConfigurationError } from '../../src/errors/taxonomy.js';

/**
 * UR-28 — the prefix-command ban is enforced in four layers, and each is asserted here so the
 * coverage is recorded rather than assumed. The Swastik HTTP ingestion surfaces (`/swastik/*`,
 * `/internal/*`) are operator/developer routes, not Discord message ingestion, so they carry no
 * message-content path either (layer 3 scans every file).
 */
const srcDir = fileURLToPath(new URL('../../src', import.meta.url));

function sourceFiles(): Array<{ path: string; source: string }> {
  return readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .filter((path) => path.endsWith('.ts'))
    .map((path) => ({ path, source: readFileSync(join(srcDir, path), 'utf8') }));
}

const MESSAGE_CONTENT_BIT = 1 << 15;

describe('M3 gate — prefix-command ban, four enforcement layers (UR-28)', () => {
  test('layer 1 (intents): the MessageContent intent is never requested', () => {
    expect(computeIntentsBitfield([['Guilds']]) & MESSAGE_CONTENT_BIT).toBe(0);
    expect(() => computeIntentsBitfield([['MessageContent']])).toThrow(ConfigurationError);
  });

  test('layer 2 (registration): only application (slash) commands are registered', () => {
    const deployer = readFileSync(join(srcDir, 'commands/command-deployer.ts'), 'utf8');
    expect(deployer).toMatch(/Routes\.applicationCommands/);
    expect(deployer).not.toMatch(/prefix/i);
  });

  test('layer 3 (handlers): no message-content handler exists anywhere in src/', () => {
    const offenders = sourceFiles().filter(({ source }) =>
      /\bmessageCreate\b|\.on\(\s*['"]message['"]/.test(source),
    );
    expect(offenders.map((o) => o.path)).toEqual([]);
  });

  test('layer 4 (source gate): no prefix-command parsing in src/', () => {
    const offenders = sourceFiles().filter(({ source }) =>
      /(?:content|message)\s*\.\s*startsWith\(\s*['"][!/]/.test(source),
    );
    expect(offenders.map((o) => o.path)).toEqual([]);
  });
});
