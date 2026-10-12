/**
 * UR-20261011-025 — the /persona page's Mode D content blocks. A formal control-plane board: the
 * bot's status headline with the Refresh control in-line (as the Section's accessory), its identity
 * as one compact field line, and the command inventory grouped by tier — every command the page
 * gathers stays visible, and the page re-gathers on demand.
 */
import type { RenderBlock } from './core-renderer.js';
import { customEmojiParts } from './module-icons.js';

const STATUS_DOT: Readonly<Record<string, string>> = {
  online: '🟢',
  offline: '🔴',
};

const TIER_LABEL: Readonly<Record<string, string>> = {
  core: 'Core',
  standard: 'Standard',
  marketplace: 'Marketplace',
};

interface TierShape {
  readonly tier: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly commands: readonly string[];
  }>;
}

function asIdentity(value: unknown): ReadonlyArray<readonly [string, string]> {
  if (!Array.isArray(value)) return [];
  const rows: Array<readonly [string, string]> = [];
  for (const entry of value) {
    if (Array.isArray(entry) && entry.length >= 2) rows.push([String(entry[0]), String(entry[1])]);
  }
  return rows;
}

function asTiers(value: unknown): readonly TierShape[] {
  if (!Array.isArray(value)) return [];
  const out: TierShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as { tier?: unknown; modules?: unknown };
    if (typeof candidate.tier !== 'string' || !Array.isArray(candidate.modules)) continue;
    const modules: Array<{ name: string; commands: string[] }> = [];
    for (const mod of candidate.modules) {
      if (typeof mod !== 'object' || mod === null) continue;
      const m = mod as { name?: unknown; commands?: unknown };
      if (typeof m.name !== 'string' || !Array.isArray(m.commands)) continue;
      modules.push({ name: m.name, commands: m.commands.map((command) => String(command)) });
    }
    out.push({ tier: candidate.tier, modules });
  }
  return out;
}

/**
 * Builds the /persona content blocks from the page data: the status headline (with the Refresh
 * accessory), the identity field line, and one block per tier listing its modules' commands.
 */
export function personaBlocks(
  data: Readonly<Record<string, unknown>> | undefined,
  invokerId: string,
): readonly RenderBlock[] {
  const status = typeof data?.['status'] === 'string' ? (data['status'] as string) : 'offline';
  const summary = typeof data?.['summary'] === 'string' ? (data['summary'] as string) : '';
  const note = typeof data?.['note'] === 'string' ? (data['note'] as string) : '';
  const identity = asIdentity(data?.['identity']);
  const tiers = asTiers(data?.['tiers']);

  const blocks: RenderBlock[] = [];

  // The status headline, with the Refresh control in-line — a Section renders its single accessory
  // on the right of the text line. `refresh` re-dispatches the page, re-gathering the live state.
  const headline = `${STATUS_DOT[status] ?? '⚪'} **Main Bot** · ${status === 'online' ? 'Online' : 'Offline'}`;
  blocks.push({
    kind: 'section',
    content: summary === '' ? headline : `${headline}\n-# ${summary}`,
    accessory: {
      customId: `dumby:act:${invokerId}:refresh:persona`,
      label: 'Refresh',
      emoji: customEmojiParts('dumby_refresh') ?? { name: '🔄' },
      style: 2,
    },
  });

  if (identity.length > 0) {
    const line = identity.map(([label, value]) => `${label}: ${value}`).join(' · ');
    blocks.push({ kind: 'text', content: `**Identity**\n-# ${line}` });
  }

  for (const group of tiers) {
    const lines = group.modules
      .map((mod) => {
        const commands =
          mod.commands.length === 0 ? '—' : mod.commands.map((c) => `\`/${c}\``).join(' · ');
        return `**${mod.name}**\n-# ${commands}`;
      })
      .join('\n');
    blocks.push({ kind: 'text', content: `**${TIER_LABEL[group.tier] ?? group.tier}**\n${lines}` });
  }

  if (note !== '') blocks.push({ kind: 'text', content: `ℹ️ ${note}` });

  return blocks;
}
