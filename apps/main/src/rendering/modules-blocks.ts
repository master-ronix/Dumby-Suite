/**
 * UR-20261011-009 — the /modules page's Mode D content blocks. A clean listing: a compact header,
 * then one Section per installed module (its logo, name and tier) with its description as subtext
 * and an inline **Info** control. The Info control opens the module's private (ephemeral) detail
 * card — the uninstall/disable control lives there, not on the listing.
 */
import type { RenderBlock } from './core-renderer.js';

interface ModuleShape {
  readonly id: string;
  readonly name: unknown;
  readonly tier: unknown;
  readonly description: unknown;
  readonly icon: unknown;
}

function asModules(value: unknown): readonly ModuleShape[] {
  if (!Array.isArray(value)) return [];
  const out: ModuleShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const m = entry as {
      id?: unknown;
      name?: unknown;
      tier?: unknown;
      description?: unknown;
      icon?: unknown;
    };
    if (typeof m.id !== 'string') continue;
    out.push({ id: m.id, name: m.name, tier: m.tier, description: m.description, icon: m.icon });
  }
  return out;
}

/**
 * Builds the /modules content blocks: the header line and one Section per module with an inline Info
 * accessory.
 */
export function modulesBlocks(
  data: Readonly<Record<string, unknown>> | undefined,
  invokerId: string,
): readonly RenderBlock[] {
  const modules = asModules(data?.['modules']);
  const total = typeof data?.['total'] === 'number' ? (data['total'] as number) : modules.length;
  const page = typeof data?.['page'] === 'number' ? (data['page'] as number) : 0;
  const pageTotal = typeof data?.['pageTotal'] === 'number' ? (data['pageTotal'] as number) : 1;

  const blocks: RenderBlock[] = [];
  const pageSuffix = pageTotal > 1 ? ` · page ${page + 1}/${pageTotal}` : '';
  blocks.push({ kind: 'text', content: `**Installed Modules** · ${total}${pageSuffix}` });

  for (const m of modules) {
    const name = String(m.name ?? m.id);
    const description = String(m.description ?? '');
    const icon = typeof m.icon === 'string' ? m.icon : '';
    // No tier here: a page is the reading surface, and tier/status marks belong in the selection
    // dropdown's options, where a member chooses.
    const heading = `${icon} **${name}**`;
    blocks.push({
      kind: 'section',
      // item 4 — the description reads as a CAPTION: dim and quoted, not body copy.
      content: description === '' ? heading : `${heading}\n-# > ${description}`,
      accessory: { customId: `dumby:info:${invokerId}:modules:${m.id}`, label: 'Info', style: 2 },
    });
  }
  return blocks;
}
