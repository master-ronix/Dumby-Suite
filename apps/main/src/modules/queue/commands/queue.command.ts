/**
 * Queue command handler — BCCM queue management (Cluster: Frame).
 * Implements the /queue command with Components V2 embed per interface.md Division 4.
 */
import type { StringSelectMenuInteraction, ButtonInteraction, ChatInputCommandInteraction, APIMessage } from 'discord.js';
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

const QUEUE_LIST_DROPDOWN_ID = 'queue:nav:dropdown';
const QUEUE_EDIT_DROPDOWN_ID = 'queue:edit:dropdown';
const QUEUE_EDIT_BUTTON_PREFIX = 'queue:edit:';
const QUEUE_CANCEL_BUTTON_PREFIX = 'queue:cancel:';

interface QueueEntry {
  id: number;
  guildId: string;
  commandName: string;
  action: 'rename' | 'alias' | 'disable' | 'enable';
  newName?: string;
  alias?: string;
  disable?: boolean;
  submittedBy: string;
  submittedAt: Date;
  status: 'queued' | 'processing' | 'completed' | 'cancelled';
}

function createQueueListEmbed(
  entries: QueueEntry[],
  bannerUrl: string,
  nextBatchTime: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  let content = '';
  if (entries.length === 0) {
    content = 'No queued command actions for this guild.';
  } else {
    for (const entry of entries) {
      const actionLabel = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
      let detail = `Command: ${entry.commandName}`;
      if (entry.action === 'rename' && entry.newName) detail += `\nNew Name: ${entry.newName}`;
      if (entry.action === 'alias' && entry.alias) detail += `\nAlias: ${entry.alias}`;
      if (entry.action === 'disable' || entry.action === 'enable') detail += `\nDisable: ${entry.disable ?? false}`;

      content += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      content += `#${entry.id}  Action: ${actionLabel}\n`;
      content += `     ${detail}\n`;
      content += `     Submitted: ${entry.submittedAt.toISOString().slice(0, 19)} UTC\n`;
      content += `     Submitted by: ${entry.submittedBy}\n`;
      content += `     Status: ${entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}\n`;

      const editButton = button(`${QUEUE_EDIT_BUTTON_PREFIX}${entry.id}`, 'Edit', 2);
      const cancelButton = button(`${QUEUE_CANCEL_BUTTON_PREFIX}${entry.id}`, 'Cancel', 4);
      const row = actionRow([editButton, cancelButton]);
      content += '\n';
      // Note: buttons need to be in the container components, not in text
      // We'll handle buttons separately
    }
  }

  const components = [
    mediaGallery(bannerUrl, 'Queue banner'),
    separator(),
    createTitleBlock('Queue'),
    separator(),
    createSectionHeader('📋', 'Pending Command Queue Actions'),
    textDisplay(`Batch window: next push in ${nextBatchTime}`),
    separator(),
    textDisplay(content || 'No queued command actions for this guild.'),
    separator(),
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createQueueEntryEmbed(
  entry: QueueEntry,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const actionLabel = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);

  let detail = `Command: ${entry.commandName}\n`;
  if (entry.action === 'rename' && entry.newName) detail += `New Name: ${entry.newName}\n`;
  if (entry.action === 'alias' && entry.alias) detail += `Alias: ${entry.alias}\n`;
  if (entry.action === 'disable' || entry.action === 'enable') detail += `Disable: ${entry.disable ?? false}\n`;

  const editButton = button(`${QUEUE_EDIT_BUTTON_PREFIX}${entry.id}`, 'Edit', 2);
  const cancelButton = button(`${QUEUE_CANCEL_BUTTON_PREFIX}${entry.id}`, 'Cancel', 4);
  const saveButton = button(`queue:save:${entry.id}`, 'Save Changes', 3);
  const backButton = button(`queue:back:${entry.id}`, 'Back to List', 2);

  const components = [
    mediaGallery(bannerUrl, 'Queue banner'),
    separator(),
    createTitleBlock('Queue'),
    separator(),
    textDisplay(`Editing queue entry #${entry.id}`),
    separator(),
    textDisplay(`${detail}\nSubmitted: ${entry.submittedAt.toISOString().slice(0, 19)} UTC\nSubmitted by: ${entry.submittedBy}\nStatus: ${entry.status}`),
    separator(),
    actionRow([saveButton, backButton]),
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

export const queueCommand: CommandDefinition = {
  data: {
    name: 'queue',
    description: 'Manage BCCM command queue actions — submit, view, edit, and cancel pending command changes.',
    options: [
      { name: 'command', type: 3, description: 'The command name to queue an action for (e.g., ban, kick)', required: false },
      { name: 'alias', type: 3, description: 'An alias name to add for the command', required: false },
      { name: 'new-name', type: 3, description: 'A new name to rename the command to', required: false },
      { name: 'disable', type: 5, description: 'Set to true to disable the command, false to re-enable', required: false },
      { name: 'action', type: 3, description: 'The BCCM action type', required: false, choices: [
        { name: 'Rename', value: 'rename' },
        { name: 'Alias', value: 'alias' },
        { name: 'Disable', value: 'disable' },
        { name: 'Enable', value: 'enable' },
      ]},
    ],
  },
  moduleId: 'queue',
  guildOnly: true,
  permissionDeclared: true,
  // @ts-ignore - function signature contravariance
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await interaction.reply({ content: 'Internal error: DI container not available', ephemeral: true } as any);
      return;
    }

    const db = container.resolve(CORE_TOKENS.Db);
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true } as any);
      return;
    }

    const commandName = interaction.options.getString('command');
    const alias = interaction.options.getString('alias');
    const newName = interaction.options.getString('new-name');
    const disable = interaction.options.getBoolean('disable');
    const action = interaction.options.getString('action') as 'rename' | 'alias' | 'disable' | 'enable' | null;

    if (commandName) {
      if (!action) {
        await interaction.reply({ content: 'Action is required when command is specified.', ephemeral: true } as any);
        return;
      }

      let determinedAction = action;
      if (action === 'rename' && !newName) {
        await interaction.reply({ content: 'New name is required for rename action.', ephemeral: true } as any);
        return;
      }
      if (action === 'alias' && !alias) {
        await interaction.reply({ content: 'Alias is required for alias action.', ephemeral: true } as any);
        return;
      }
      if ((action === 'disable' || action === 'enable') && disable === null) {
        await interaction.reply({ content: 'Disable flag is required for disable/enable action.', ephemeral: true } as any);
        return;
      }

      const reservedCommands = ['help', 'giphy', 'tenor'];
      if (action === 'alias' && reservedCommands.includes(alias?.toLowerCase() ?? '')) {
        await interaction.reply({ content: 'Cannot alias a reserved Discord command.', ephemeral: true } as any);
        return;
      }

      const currentCommands = await db.knex('guild_command_queue')
        .where({ guildId })
        .whereNull('deletedAt')
        .count('* as count')
        .first();
      const currentCount = Number(currentCommands?.count ?? 0);
      const maxCommands = 100;
      if (currentCount >= maxCommands) {
        await interaction.reply({ content: `Guild command limit (${maxCommands}) would be exceeded. Current: ${currentCount}`, ephemeral: true } as any);
        return;
      }

      await db.knex('guild_command_queue').insert({
        guildId,
        commandName,
        action: determinedAction,
        newName: determinedAction === 'rename' ? newName : null,
        alias: determinedAction === 'alias' ? alias : null,
        disable: determinedAction === 'disable' ? true : (determinedAction === 'enable' ? false : null),
        submittedBy: interaction.user.id,
        submittedAt: new Date(),
        status: 'queued',
      });

      await interaction.reply({ content: `Queued ${determinedAction} action for command "${commandName}".`, ephemeral: true } as any);
      return;
    }

    const entries = await db.knex<QueueEntry>('guild_command_queue')
      .where({ guildId })
      .whereNull('deletedAt')
      .orderBy('submittedAt', 'asc');

    const queueEntries: QueueEntry[] = entries.map((e) => ({
      ...e,
      submittedAt: new Date(e.submittedAt),
    }));

    const nextBatchHours = 8;
    const nextBatchMinutes = 23;
    const nextBatchTime = `~${nextBatchHours}h ${nextBatchMinutes}m`;

    const bannerUrl = getDefaultBannerUrl('Queue', DEFAULT_ACCENT_COLOR);
    const embed = createQueueListEmbed(queueEntries, bannerUrl, nextBatchTime);

    const message = await interaction.reply({ ...embed, fetchReply: true } as any);

    const msg = message as APIMessage;
    try {
      const cache = container.resolve(CORE_TOKENS.Cache);
      await cache.set(`queue:message:${guildId}:${interaction.user.id}`, JSON.stringify({
        channelId: interaction.channelId,
        messageId: msg.id,
        userId: interaction.user.id,
        guildId,
        type: 'list',
      }), 3600000);
    } catch {
    }
  },
};

export async function handleQueueComponent(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  container: Container,
): Promise<boolean> {
  return (async () => {
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === QUEUE_LIST_DROPDOWN_ID || interaction.customId === QUEUE_EDIT_DROPDOWN_ID) {
        await interaction.deferUpdate();
        return true;
      }
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

    if (customId.startsWith(QUEUE_EDIT_BUTTON_PREFIX)) {
      const entryId = Number(customId.slice(QUEUE_EDIT_BUTTON_PREFIX.length));
      const db = container.resolve(CORE_TOKENS.Db);
      const guildId = interaction.guildId!;

      const entry = await db.knex<QueueEntry>('guild_command_queue')
        .where({ id: entryId, guildId })
        .whereNull('deletedAt')
        .first();

      if (!entry) {
        await interaction.reply({ content: 'Queue entry not found.', ephemeral: true } as any);
        return true;
      }

      const bannerUrl = getDefaultBannerUrl('Queue', DEFAULT_ACCENT_COLOR);
      const embed = createQueueEntryEmbed(entry, bannerUrl);
      await interaction.update(embed as any as any);
      return true;
    }

    if (customId.startsWith(QUEUE_CANCEL_BUTTON_PREFIX)) {
      const entryId = Number(customId.slice(QUEUE_CANCEL_BUTTON_PREFIX.length));
      const db = container.resolve(CORE_TOKENS.Db);
      const guildId = interaction.guildId!;

      await db.knex('guild_command_queue')
        .where({ id: entryId, guildId })
        .whereNull('deletedAt')
        .update({ status: 'cancelled', deletedAt: new Date() });

      await interaction.reply({ content: `Queue entry #${entryId} cancelled.`, ephemeral: true } as any);
      return true;
    }

    if (customId.startsWith('queue:back:')) {
      const db = container.resolve(CORE_TOKENS.Db);
      const guildId = interaction.guildId!;

      const entries = await db.knex<QueueEntry>('guild_command_queue')
        .where({ guildId })
        .whereNull('deletedAt')
        .orderBy('submittedAt', 'asc');

      const queueEntries: QueueEntry[] = entries.map((e) => ({
        ...e,
        submittedAt: new Date(e.submittedAt),
      }));

      const bannerUrl = getDefaultBannerUrl('Queue', DEFAULT_ACCENT_COLOR);
      const embed = createQueueListEmbed(queueEntries, bannerUrl, '~8h 23m');
      await interaction.update(embed as any as any);
      return true;
    }
  }

  return false;
  })();
}