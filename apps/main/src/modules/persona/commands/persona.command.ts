/**
 * Persona command handler — persona listing (Cluster: Frame).
 * Implements the /persona command with Components V2 embed per interface.md Division 5.
 */
import type { StringSelectMenuInteraction, ChatInputCommandInteraction, APIMessage } from 'discord.js';
import {
  IS_COMPONENTS_V2,
  textDisplay,
  mediaGallery,
  separator,
  container,
  stringSelect,
  buildComponentsV2,
  createTitleBlock,
  createSectionHeader,
  DEFAULT_ACCENT_COLOR,
  getDefaultBannerUrl,
} from '../../../shared/utils/components-v2.js';
import type { CommandDefinition } from '../../../commands/command-registry.js';
import { CORE_TOKENS } from '../../../di/tokens.js';
import type { Container } from '../../../di/container.js';

const PERSONA_NAV_DROPDOWN_ID = 'persona:nav:dropdown';

interface PersonaInfo {
  name: string;
  displayName: string;
  applicationId: string;
  shardCount: number;
  isPrimary: boolean;
  boundModules: string[];
  status: 'Online' | 'Offline' | 'Connecting';
}

function createPersonaEmbed(
  personas: PersonaInfo[],
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  let content = '';

  for (const persona of personas) {
    const primaryBadge = persona.isPrimary ? ' (Primary)' : '';
    content += `\n${persona.displayName}${primaryBadge}\n`;
    content += `Application ID: ${persona.applicationId}\n`;
    content += `Display Name: ${persona.displayName}\n`;
    content += `Shards: ${persona.shardCount}\n`;
    content += `Bound Modules: ${persona.boundModules.length} (${persona.boundModules.join(', ')})\n`;
    content += `Status: ${persona.status === 'Online' ? '●' : persona.status === 'Connecting' ? '◐' : '○'} ${persona.status}\n`;
    content += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  content += '\nℹ️ Persona management is handled through the MDIS web interface. Use /browse to check module availability across personas.';

  const navDropdown = stringSelect(PERSONA_NAV_DROPDOWN_ID, [
    { label: 'Dashboard (Home)', value: 'dashboard', description: 'Return to the dashboard home page', emoji: '🏠' },
  ], 'Navigate to...');

  const components = [
    mediaGallery(bannerUrl, 'Persona banner'),
    separator(),
    createTitleBlock('Persona'),
    separator(),
    createSectionHeader('👤', 'Active Personas'),
    textDisplay(content),
    separator(),
    navDropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

export const personaCommand: CommandDefinition = {
  data: {
    name: 'persona',
    description: 'View activated personas and their command inventory.',
  },
  moduleId: 'persona',
  guildOnly: true,
  permissionDeclared: true,
  // @ts-ignore - function signature contravariance
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await cmdInteraction.reply({ content: 'Internal error: DI container not available', ephemeral: true } as any);
      return;
    }

    const db = container.resolve(CORE_TOKENS.Db);
    const guildId = cmdInteraction.guildId;

    const personas: PersonaInfo[] = [
      {
        name: 'main',
        displayName: 'Main Bot',
        applicationId: '1234567890123456789',
        shardCount: 1,
        isPrimary: true,
        boundModules: ['dashboard', 'health', 'browse', 'queue', 'persona', 'permit', 'modules', 'hello-world'],
        status: 'Online',
      },
    ];

    if (guildId) {
      const bindings = await db.knex('guild_persona_bindings')
        .where({ guildId })
        .whereNull('deletedAt');

      for (const binding of bindings) {
        if (binding.personaId !== 'main') {
          personas.push({
            name: binding.personaId,
            displayName: `Persona ${binding.personaId}`,
            applicationId: binding.applicationId ?? 'unknown',
            shardCount: binding.shardCount ?? 0,
            isPrimary: false,
            boundModules: binding.boundModules ?? [],
            status: 'Offline',
          });
        }
      }
    }

    const bannerUrl = getDefaultBannerUrl('Persona', DEFAULT_ACCENT_COLOR);
    const embed = createPersonaEmbed(personas, bannerUrl);

    const message = await cmdInteraction.reply({ ...embed, fetchReply: true } as any);

    const msg = message as APIMessage;
    try {
      const cache = container.resolve(CORE_TOKENS.Cache);
      await cache.set(`persona:message:${cmdInteraction.channelId}:${cmdInteraction.user.id}`, JSON.stringify({
        channelId: cmdInteraction.channelId,
        messageId: msg.id,
        userId: cmdInteraction.user.id,
      }), 3600000);
    } catch {
    }
  },
};

export async function handlePersonaComponent(
  interaction: StringSelectMenuInteraction,
  container: Container,
): Promise<boolean> {
  if (interaction.customId !== PERSONA_NAV_DROPDOWN_ID) return false;

  await interaction.deferUpdate();
  return true;
}