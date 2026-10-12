/**
 * UR-20261012-026 — the /persona page's Mode D content blocks.
 *
 * A formal control-plane board for one persona at a time. The page opens on the profile of the
 * persona that is actually running the command in this guild (not a hardcoded main bot), states
 * that profile's identity on a single field line, and lists the commands the profile owns — grouped
 * by tier and led by each module's own logo. A profile switcher sits under the headline so a member
 * can move between every persona active in the guild without leaving the page.
 *
 * Every indicator is a custom application emoji (UR-20261012-026); a unicode fallback applies until
 * the emoji upload lands, so the board never renders without an indicator.
 */
import type { NavigationOption, RenderBlock } from './core-renderer.js';
import {
  customEmojiParts,
  customEmojiRef,
  IDENTITY_FALLBACK,
  IDENTITY_ICON_NAME,
  INFO_FALLBACK,
  INFO_ICON_NAME,
  PROFILE_FALLBACK,
  PROFILE_ICON_NAME,
  STATUS_OFFLINE_FALLBACK,
  STATUS_OFFLINE_ICON_NAME,
  STATUS_ONLINE_FALLBACK,
  STATUS_ONLINE_ICON_NAME,
} from './module-icons.js';

const TIER_LABEL: Readonly<Record<string, string>> = {
  core: 'Core',
  standard: 'Standard',
  marketplace: 'Marketplace',
};

interface ProfileShape {
  readonly id: string;
  readonly name: string;
  readonly isMain: boolean;
  readonly applicationId: string;
  readonly shards: string;
  readonly dmBehavior: string;
  readonly statusKind: string;
  readonly statusLabel: string;
  readonly moduleCount: number;
  readonly commandCount: number;
}

interface TierShape {
  readonly tier: string;
  readonly modules: ReadonlyArray<{
    readonly name: string;
    readonly icon: string;
    readonly commands: readonly string[];
  }>;
}

/** The status indicator for a profile: the custom emoji when uploaded, else its unicode fallback. */
function statusIcon(kind: string): string {
  const online = kind === 'online' || kind === 'active';
  return online
    ? (customEmojiRef(STATUS_ONLINE_ICON_NAME) ?? STATUS_ONLINE_FALLBACK)
    : (customEmojiRef(STATUS_OFFLINE_ICON_NAME) ?? STATUS_OFFLINE_FALLBACK);
}

const identityIcon = (): string => customEmojiRef(IDENTITY_ICON_NAME) ?? IDENTITY_FALLBACK;
const infoIcon = (): string => customEmojiRef(INFO_ICON_NAME) ?? INFO_FALLBACK;

function asProfiles(value: unknown): readonly ProfileShape[] {
  if (!Array.isArray(value)) return [];
  const out: ProfileShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const p = entry as Record<string, unknown>;
    if (typeof p['id'] !== 'string' || typeof p['name'] !== 'string') continue;
    out.push({
      id: p['id'],
      name: p['name'],
      isMain: p['isMain'] === true,
      applicationId: typeof p['applicationId'] === 'string' ? p['applicationId'] : '',
      shards: typeof p['shards'] === 'string' ? p['shards'] : '',
      dmBehavior: typeof p['dmBehavior'] === 'string' ? p['dmBehavior'] : '',
      statusKind: typeof p['statusKind'] === 'string' ? p['statusKind'] : 'offline',
      statusLabel: typeof p['statusLabel'] === 'string' ? p['statusLabel'] : 'Offline',
      moduleCount: typeof p['moduleCount'] === 'number' ? p['moduleCount'] : 0,
      commandCount: typeof p['commandCount'] === 'number' ? p['commandCount'] : 0,
    });
  }
  return out;
}

function asTiers(value: unknown): readonly TierShape[] {
  if (!Array.isArray(value)) return [];
  const out: TierShape[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue;
    const candidate = entry as { tier?: unknown; modules?: unknown };
    if (typeof candidate.tier !== 'string' || !Array.isArray(candidate.modules)) continue;
    const modules: Array<{ name: string; icon: string; commands: string[] }> = [];
    for (const mod of candidate.modules) {
      if (typeof mod !== 'object' || mod === null) continue;
      const m = mod as { name?: unknown; icon?: unknown; commands?: unknown };
      if (typeof m.name !== 'string' || !Array.isArray(m.commands)) continue;
      modules.push({
        name: m.name,
        icon: typeof m.icon === 'string' ? m.icon : '',
        commands: m.commands.map((command) => String(command)),
      });
    }
    out.push({ tier: candidate.tier, modules });
  }
  return out;
}

/**
 * Builds the /persona content blocks: the selected profile's headline (with the Refresh accessory),
 * the profile switcher, the identity field line, the tier-grouped command inventory, and the note.
 */
export function personaBlocks(
  data: Readonly<Record<string, unknown>> | undefined,
  invokerId: string,
): readonly RenderBlock[] {
  const profiles = asProfiles(data?.['profiles']);
  const tiers = asTiers(data?.['tiers']);
  const note = typeof data?.['note'] === 'string' ? (data['note'] as string) : '';
  const currentId = typeof data?.['currentProfileId'] === 'string' ? data['currentProfileId'] : '';
  const selectedId =
    typeof data?.['selectedProfileId'] === 'string' ? data['selectedProfileId'] : currentId;

  const selected = profiles.find((p) => p.id === selectedId) ?? profiles[0];
  const blocks: RenderBlock[] = [];

  // The headline, with the Refresh control in-line (a Section renders its single accessory on the
  // right of the text line). `refresh` re-dispatches the page, re-gathering the live state.
  const headline =
    selected === undefined
      ? `${statusIcon('offline')} **No profile** · Unavailable`
      : `${statusIcon(selected.statusKind)} **${selected.name}** · ${selected.statusLabel}`;
  const subtext =
    selected === undefined
      ? ''
      : `${selected.moduleCount} module${selected.moduleCount === 1 ? '' : 's'} · ${selected.commandCount} command${selected.commandCount === 1 ? '' : 's'}`;
  blocks.push({
    kind: 'section',
    content: subtext === '' ? headline : `${headline}\n-# ${subtext}`,
    accessory: {
      customId: `dumby:act:${invokerId}:refresh:persona`,
      label: 'Refresh',
      emoji: customEmojiParts('dumby_refresh') ?? { name: '\u{1F504}' },
      style: 2,
    },
  });

  // The profile switcher — present whenever the guild has at least one profile, and disabled while
  // there is nothing to switch to, so the control teaches its own affordance without dead-ending.
  if (profiles.length > 0) {
    const profileIcon = customEmojiParts(PROFILE_ICON_NAME);
    const options: NavigationOption[] = profiles.map((p) => ({
      label: p.name.length > 0 ? p.name : p.id,
      value: p.id,
      description:
        p.id === currentId
          ? `Running this command · ${p.commandCount} commands`
          : `${p.commandCount} commands`,
      ...(profileIcon !== undefined ? { emoji: profileIcon } : { emoji: PROFILE_FALLBACK }),
      ...(p.id === selectedId ? { default: true } : {}),
    }));
    blocks.push({
      kind: 'select',
      customId: `dumby:act:${invokerId}:profile:persona`,
      placeholder:
        profiles.length < 2
          ? 'Only one profile is active in this guild'
          : 'Switch to another persona\u2026',
      options,
      ...(profiles.length < 2 ? { disabled: true } : {}),
    });
  }

  // The identity line: one compact field line, and deliberately no "bound server" entry — the page
  // only ever lists personas bound to this guild, so restating the guild is noise.
  if (selected !== undefined) {
    const fields: string[] = [];
    if (selected.applicationId !== '') fields.push(`Application ID \`${selected.applicationId}\``);
    if (selected.shards !== '') fields.push(`Shards \`${selected.shards}\``);
    if (selected.dmBehavior !== '') fields.push(`DM \`${selected.dmBehavior}\``);
    if (fields.length > 0) {
      blocks.push({
        kind: 'text',
        content: `${identityIcon()} **Identity**\n-# ${fields.join(' · ')}`,
      });
    }
  }

  // The command inventory: one tier header carrying its module count, then one tidy line per module
  // — its own logo, its name, and the commands it owns.
  for (const group of tiers) {
    const lines = group.modules
      .map((mod) => {
        const commands =
          mod.commands.length === 0 ? '—' : mod.commands.map((c) => `\`/${c}\``).join(' · ');
        const logo = mod.icon === '' ? '' : `${mod.icon} `;
        return `${logo}**${mod.name}** — ${commands}`;
      })
      .join('\n');
    const count = group.modules.length;
    blocks.push({
      kind: 'text',
      content: `**${TIER_LABEL[group.tier] ?? group.tier}** · ${count} module${count === 1 ? '' : 's'}\n${lines}`,
    });
  }

  if (note !== '') blocks.push({ kind: 'text', content: `${infoIcon()} ${note}` });

  return blocks;
}
