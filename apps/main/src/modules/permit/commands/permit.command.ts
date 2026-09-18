/**
 * Permit command handler — RBAC management (Cluster: Frame).
 * Implements the /permit command with Components V2 embed per interface.md Division 6.
 */
import type { StringSelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
import {
  IS_COMPONENTS_V2,
  textDisplay,
  mediaGallery,
  separator,
  container,
  stringSelect,
  button,
  actionRow,
  buildComponentsV2,
  createTitleBlock,
  createSectionHeader,
  DEFAULT_ACCENT_COLOR,
  getDefaultBannerUrl,
} from '../../../shared/utils/components-v2.js';
import type { CommandDefinition } from '../../../commands/command-registry.js';
import { CORE_TOKENS } from '../../../di/tokens.js';
import type { Container } from '../../../di/container.js';

const PERMIT_MAIN_DROPDOWN_ID = 'permit:main:dropdown';
const PERMIT_COMMAND_DROPDOWN_ID = 'permit:command:dropdown';
const PERMIT_TARGET_DROPDOWN_ID = 'permit:target:dropdown';
const PERMIT_ACTION_BUTTON_PREFIX = 'permit:action:';

type PermitMode = 'grant' | 'whitelist' | 'blacklist' | 'quota' | 'cooldown' | null;
type PermitStep = 'main' | 'command' | 'target' | 'details';

interface PermitState {
  mode: PermitMode;
  step: PermitStep;
  commandName?: string;
  targetId?: string;
  targetType?: 'role' | 'user' | 'group' | 'set';
}

function getPermitStateCacheKey(channelId: string, userId: string): string {
  return `permit:state:${channelId}:${userId}`;
}

function buildMainOptions(): Array<{ label: string; value: string; description?: string; emoji?: string }> {
  return [
    { label: 'Grant Access', value: 'grant', description: 'Grant access to a command for roles/groups/sets', emoji: '✅' },
    { label: 'Whitelist', value: 'whitelist', description: 'Add a user or role to the whitelist', emoji: '📝' },
    { label: 'Blacklist', value: 'blacklist', description: 'Add a user or role to the blacklist', emoji: '🚫' },
    { label: 'Quota', value: 'quota', description: 'Set resource quotas for a command or module', emoji: '📊' },
    { label: 'Cooldown', value: 'cooldown', description: 'Set cooldown duration and scope for a command', emoji: '⏱️' },
  ];
}

function createMainEmbed(bannerUrl: string, accentColor = DEFAULT_ACCENT_COLOR): ReturnType<typeof buildComponentsV2> {
  const dropdown = stringSelect(PERMIT_MAIN_DROPDOWN_ID, buildMainOptions(), 'Select an action...');

  const components = [
    mediaGallery(bannerUrl, 'Permit banner'),
    separator(),
    createTitleBlock('Permit'),
    separator(),
    textDisplay('Manage RBAC grants, whitelists, blacklists, quotas, and cooldowns.\n\nSelect an action to begin:'),
    separator(),
    dropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createCommandSelectionEmbed(
  mode: PermitMode,
  commands: Array<{ name: string; module: string; version: string; description: string }>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const modeLabels: Record<string, string> = {
    grant: 'Grant Access',
    whitelist: 'Whitelist',
    blacklist: 'Blacklist',
    quota: 'Quota',
    cooldown: 'Cooldown',
  };

  const options = commands.slice(0, 25).map((cmd) => ({
    label: cmd.name,
    value: `command:${cmd.name}`,
    description: `${cmd.module} v${cmd.version} — ${cmd.description.slice(0, 80)}`,
    emoji: '📦',
  }));

  const dropdown = stringSelect(PERMIT_COMMAND_DROPDOWN_ID, options, 'Select a command...');

  const components = [
    mediaGallery(bannerUrl, 'Permit banner'),
    separator(),
    createTitleBlock('Permit'),
    separator(),
    textDisplay(`${modeLabels[mode ?? '']} — Step 1: Select Command`),
    separator(),
    dropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createTargetSelectionEmbed(
  mode: PermitMode,
  commandName: string,
  targets: Array<{ id: string; name: string; type: 'role' | 'user' | 'group' | 'set' }>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const modeLabels: Record<string, string> = {
    grant: 'Grant Access',
    whitelist: 'Whitelist',
    blacklist: 'Blacklist',
    quota: 'Quota',
    cooldown: 'Cooldown',
  };

  const typeEmoji: Record<string, string> = {
    role: '👤',
    user: '👤',
    group: '👥',
    set: '📋',
  };

  const options = targets.slice(0, 25).map((target) => ({
    label: target.name,
    value: `target:${target.id}:${target.type}`,
    description: `${typeEmoji[target.type]} ${target.type.charAt(0).toUpperCase() + target.type.slice(1)}`,
    emoji: typeEmoji[target.type],
  })) as Array<{ label: string; value: string; description: string; emoji: string }>;

  const dropdown = stringSelect(PERMIT_TARGET_DROPDOWN_ID, options, 'Select target... (search enabled)');

  const components = [
    mediaGallery(bannerUrl, 'Permit banner'),
    separator(),
    createTitleBlock('Permit'),
    separator(),
    textDisplay(`${modeLabels[mode ?? '']} — Step 2: Select Target\nCommand: ${commandName}`),
    separator(),
    dropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createDetailsEmbed(
  mode: PermitMode,
  commandName: string,
  targetName: string,
  targetType: string,
  currentGrants: string[],
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const modeLabels: Record<string, string> = {
    grant: 'Grant Access',
    whitelist: 'Whitelist',
    blacklist: 'Blacklist',
    quota: 'Quota',
    cooldown: 'Cooldown',
  };

  let buttons: ReturnType<typeof actionRow>[] = [];
  let detailsContent = `Command: ${commandName}\nTarget: ${targetName} (${targetType})\n\nCurrent Grants:\n`;

  if (currentGrants.length === 0) {
    detailsContent += 'No grants configured.';
  } else {
    detailsContent += currentGrants.join('\n');
  }

  if (mode === 'grant') {
    buttons = [
      actionRow([button('permit:action:grant:allow', 'Grant Access', 3), button('permit:action:grant:deny', 'Grant Decline', 4), button('permit:action:grant:edit', 'Grant Edit', 2)]),
    ];
  } else if (mode === 'whitelist') {
    buttons = [
      actionRow([button('permit:action:whitelist:add', 'Add to Whitelist', 3), button('permit:action:whitelist:remove', 'Remove from Whitelist', 4), button('permit:action:whitelist:edit', 'Edit Whitelist Entry', 2)]),
    ];
  } else if (mode === 'blacklist') {
    buttons = [
      actionRow([button('permit:action:blacklist:add', 'Add to Blacklist', 3), button('permit:action:blacklist:remove', 'Remove from Blacklist', 4), button('permit:action:blacklist:edit', 'Edit Blacklist Entry', 2)]),
    ];
  } else if (mode === 'quota') {
    buttons = [
      actionRow([button('permit:action:quota:set', 'Set Quota', 3), button('permit:action:quota:remove', 'Remove Quota', 4), button('permit:action:quota:edit', 'Edit Quota', 2)]),
    ];
  } else if (mode === 'cooldown') {
    buttons = [
      actionRow([button('permit:action:cooldown:set', 'Set Cooldown', 3), button('permit:action:cooldown:remove', 'Remove Cooldown', 4), button('permit:action:cooldown:edit', 'Edit Cooldown', 2)]),
    ];
  }

  const components = [
    mediaGallery(bannerUrl, 'Permit banner'),
    separator(),
    createTitleBlock('Permit'),
    separator(),
    textDisplay(`${modeLabels[mode ?? '']} — Step 3: Details`),
    separator(),
    textDisplay(detailsContent),
    separator(),
    ...buttons.flat(),
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

export const permitCommand: CommandDefinition = {
  data: {
    name: 'permit',
    description: 'Manage RBAC grants, whitelists, blacklists, quotas, and cooldowns.',
    options: [
      { name: 'grant', type: 1, description: 'Grant access to a command for specific roles, groups, or sets', required: false },
      { name: 'whitelist', type: 1, description: 'Add a user or role to the whitelist for a command', required: false },
      { name: 'blacklist', type: 1, description: 'Add a user or role to the blacklist for a command', required: false },
      { name: 'quota', type: 1, description: 'Set resource quotas for a command or module', required: false },
      { name: 'cooldown', type: 1, description: 'Set cooldown duration and scope for a command', required: false },
    ],
  },
  moduleId: 'permit',
  guildOnly: true,
  permissionDeclared: true,
  // @ts-ignore - function signature contravariance
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as import('discord.js').ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await interaction.reply({ content: 'Internal error: DI container not available', ephemeral: true } as any);
      return;
    }

    const cache = container.resolve(CORE_TOKENS.Cache);
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;

    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true } as any);
      return;
    }

    let mode: PermitMode = null;
    if (interaction.options.getSubcommand(false) === 'grant') mode = 'grant';
    else if (interaction.options.getSubcommand(false) === 'whitelist') mode = 'whitelist';
    else if (interaction.options.getSubcommand(false) === 'blacklist') mode = 'blacklist';
    else if (interaction.options.getSubcommand(false) === 'quota') mode = 'quota';
    else if (interaction.options.getSubcommand(false) === 'cooldown') mode = 'cooldown';

    if (!mode) {
      const bannerUrl = getDefaultBannerUrl('Permit', DEFAULT_ACCENT_COLOR);
      const embed = createMainEmbed(bannerUrl);
      await interaction.reply(embed as any as any);
      return;
    }

    const state: PermitState = { mode, step: 'command' };
    await cache.set(getPermitStateCacheKey(channelId, userId), JSON.stringify(state), 300000);

    const commands = [
      { name: 'ban', module: 'moderation', version: '2.1.0', description: 'Ban a member' },
      { name: 'kick', module: 'moderation', version: '2.1.0', description: 'Kick a member' },
      { name: 'mute', module: 'moderation', version: '2.1.0', description: 'Timeout a member' },
      { name: 'warn', module: 'moderation', version: '2.1.0', description: 'Warn a member' },
      { name: 'play', module: 'music', version: '1.3.0', description: 'Play music' },
    ];

    const bannerUrl = getDefaultBannerUrl('Permit', DEFAULT_ACCENT_COLOR);
    const embed = createCommandSelectionEmbed(mode, commands, bannerUrl);
    await interaction.reply(embed as any as any);
  },
};

export async function handlePermitComponent(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  container: Container,
): Promise<boolean> {
  return (async () => {
    let handled = false;
    const cache = container.resolve(CORE_TOKENS.Cache);
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const customId = interaction.customId;

    const stateRaw = await cache.get(getPermitStateCacheKey(channelId, userId));
    if (!stateRaw) return false;

    let state: PermitState = JSON.parse(stateRaw);

    if (interaction.isStringSelectMenu()) {
    if (customId === PERMIT_MAIN_DROPDOWN_ID) {
      const value = interaction.values[0];
      if (['grant', 'whitelist', 'blacklist', 'quota', 'cooldown'].includes(value)) {
        state.mode = value as PermitMode;
        state.step = 'command';
        await cache.set(getPermitStateCacheKey(channelId, userId), JSON.stringify(state), 300000);

        const commands = [
          { name: 'ban', module: 'moderation', version: '2.1.0', description: 'Ban a member' },
          { name: 'kick', module: 'moderation', version: '2.1.0', description: 'Kick a member' },
          { name: 'mute', module: 'moderation', version: '2.1.0', description: 'Timeout a member' },
          { name: 'warn', module: 'moderation', version: '2.1.0', description: 'Warn a member' },
          { name: 'play', module: 'music', version: '1.3.0', description: 'Play music' },
        ];

        const bannerUrl = getDefaultBannerUrl('Permit', DEFAULT_ACCENT_COLOR);
        const embed = createCommandSelectionEmbed(state.mode, commands, bannerUrl);
        await interaction.update(embed as any as any);
      }
      return true;
    }

    if (customId === PERMIT_COMMAND_DROPDOWN_ID) {
      const value = interaction.values[0];
      if (value.startsWith('command:')) {
        state.commandName = value.slice(8);
        state.step = 'target';
        await cache.set(getPermitStateCacheKey(channelId, userId), JSON.stringify(state), 300000);

        const targets = [
          { id: 'role:moderator', name: '@Moderator', type: 'role' as const },
          { id: 'group:mod-team', name: 'Moderation Team', type: 'group' as const },
          { id: 'set:senior-staff', name: 'Senior Staff', type: 'set' as const },
          { id: 'role:helper', name: '@Helper', type: 'role' as const },
        ];

        const bannerUrl = getDefaultBannerUrl('Permit', DEFAULT_ACCENT_COLOR);
        const embed = createTargetSelectionEmbed(state.mode, state.commandName, targets, bannerUrl);
        await interaction.update(embed as any as any);
      }
      return true;
    }

    if (customId === PERMIT_TARGET_DROPDOWN_ID) {
      const value = interaction.values[0];
      if (value.startsWith('target:')) {
        const parts = value.slice(7).split(':');
        state.targetId = parts[0];
        state.targetType = parts[1] as 'role' | 'user' | 'group' | 'set';
        state.step = 'details';
        await cache.set(getPermitStateCacheKey(channelId, userId), JSON.stringify(state), 300000);

        const currentGrants = [
          'Permission: moderation.ban\nGrant Type: ALLOW\nSource: Role assignment\nGranted by: @AdminUser on 2026-07-20\nExpires: Never',
        ];

        const targetName = state.targetType === 'role' ? '@Moderator' :
                          state.targetType === 'group' ? 'Moderation Team' :
                          state.targetType === 'set' ? 'Senior Staff' : 'Helper';

        const bannerUrl = getDefaultBannerUrl('Permit', DEFAULT_ACCENT_COLOR);
        const embed = createDetailsEmbed(state.mode, state.commandName!, targetName, state.targetType, currentGrants, bannerUrl);
        await interaction.update(embed as any as any);
      }
      return true;
    }
  }

  if (interaction.isButton()) {
    if (customId.startsWith(PERMIT_ACTION_BUTTON_PREFIX)) {
      await interaction.reply({ content: 'Action processed (placeholder implementation)', ephemeral: true } as any);
      return true;
    }
  }

  return false;
  })();
}