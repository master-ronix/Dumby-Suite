/**
 * Browse command handler — marketplace interface (Cluster: Frame).
 * Implements the /browse command with Components V2 embed per interface.md Division 3.
 */
import type { ChatInputCommandInteraction, StringSelectMenuInteraction, APIMessage } from 'discord.js';
import {
  IS_COMPONENTS_V2,
  textDisplay,
  mediaGallery,
  separator,
  container,
  stringSelect,
  buildComponentsV2,
  createMarketplaceTitleBlock,
  createSectionHeader,
  DEFAULT_ACCENT_COLOR,
  getDefaultBannerUrl,
} from '../../../shared/utils/components-v2.js';
import type { CommandDefinition } from '../../../commands/command-registry.js';
import { ModuleRegistry } from '../../../modules/registry.js';
import { CORE_TOKENS } from '../../../di/tokens.js';
import type { Container } from '../../../di/container.js';

const BROWSE_DROPDOWN_ID = 'browse:install:dropdown';

interface ModuleInfo {
  name: string;
  displayName: string;
  version: string;
  tier: string;
  description: string;
  logoEmoji: string;
  isInstalled: boolean;
  isCore: boolean;
}

function getModuleRegistry(container: Container): ModuleRegistry {
  return container.resolve<ModuleRegistry>(CORE_TOKENS.ModuleRegistry);
}

function buildInstalledModulesList(modules: ModuleInfo[]): string {
  if (modules.length === 0) {
    return 'No modules installed.';
  }
  return modules
    .map((m) => `${m.logoEmoji} ${m.name.padEnd(15)} v${m.version.padEnd(7)} ${m.tier.padEnd(8)} — ${m.description}`)
    .join('\n');
}

function buildInstallDropdownOptions(
  marketplaceModules: ModuleInfo[],
): Array<{ label: string; value: string; description?: string; emoji?: string }> {
  return marketplaceModules.slice(0, 25).map((mod) => ({
    label: mod.displayName,
    value: `install:${mod.name}`,
    description: `🛒 ${mod.description.slice(0, 90)}`,
    emoji: mod.logoEmoji,
  }));
}

function createBrowseEmbed(
  installedContent: string,
  installDropdown: ReturnType<typeof stringSelect>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const components = [
    mediaGallery(bannerUrl, 'Marketplace banner'),
    separator(),
    createMarketplaceTitleBlock(),
    separator(),
    createSectionHeader('📦', 'Installed & Standard-Tier Modules'),
    textDisplay(installedContent),
    separator(),
    textDisplay('Select a module to install:'),
    installDropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

export const browseCommand: CommandDefinition = {
  data: {
    name: 'browse',
    description: 'Browse the marketplace, discover modules, and install them.',
  },
  moduleId: 'browse',
  guildOnly: true,
  permissionDeclared: true,
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await cmdInteraction.reply({
        content: 'Internal error: DI container not available',
        ephemeral: true,
      });
      return;
    }

    const moduleRegistry = getModuleRegistry(container);
    const guildId = cmdInteraction.guildId;

    const isModuleEnabledInGuild = async (moduleId: string, guildId: string | null): Promise<boolean> => {
      if (!guildId) return false;
      try {
        const db = container.resolve(CORE_TOKENS.Db);
        const row = await db
          .knex('guild_module_states')
          .where({ guildId, moduleSlug: moduleId })
          .whereNull('deletedAt')
          .first<{ enabled: boolean; state: string }>();

        if (row === undefined) {
          const mod = moduleRegistry.get(moduleId);
          const tier = mod?.manifest.tier ?? 'marketplace';
          return tier === 'core' || tier === 'standard' || tier === 'admin';
        }
        return row.enabled === true && row.state === 'active';
      } catch {
        const mod = moduleRegistry.get(moduleId);
        const tier = mod?.manifest.tier ?? 'marketplace';
        return tier === 'core' || tier === 'standard' || tier === 'admin';
      }
    };

    const allModules = moduleRegistry.all();
    const installedModules: ModuleInfo[] = [];
    const marketplaceModules: ModuleInfo[] = [];

    for (const mod of allModules) {
      const manifest = mod.manifest;
      const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
      const moduleInfo: ModuleInfo = {
        name: manifest.name,
        displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
        version: manifest.version,
        tier: manifest.tier,
        description: manifest.description,
        logoEmoji: '📦',
        isInstalled: enabled,
        isCore: manifest.tier === 'core' || manifest.tier === 'admin',
      };

      if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
        installedModules.push(moduleInfo);
      } else if (manifest.tier === 'marketplace') {
        marketplaceModules.push(moduleInfo);
      }
    }

    const installedContent = buildInstalledModulesList(installedModules);
    const bannerUrl = getDefaultBannerUrl('Marketplace', DEFAULT_ACCENT_COLOR);
    const installDropdown = stringSelect(BROWSE_DROPDOWN_ID, buildInstallDropdownOptions(marketplaceModules), 'Select a module to install...');

    const message = await cmdInteraction.reply({
      ...createBrowseEmbed(installedContent, installDropdown, bannerUrl),
      fetchReply: true,
    } as any);

    const msg = message as unknown as APIMessage;
    // Store message reference for edit-in-place
    try {
      const cache = container.resolve(CORE_TOKENS.Cache);
      await cache.set(`browse:message:${cmdInteraction.channelId}:${cmdInteraction.user.id}`, JSON.stringify({
        channelId: cmdInteraction.channelId,
        messageId: msg.id,
        userId: cmdInteraction.user.id,
        guildId,
      }), 3600000);
    } catch {
    }
  },
};

async function handleInstallDropdown(
  interaction: StringSelectMenuInteraction,
  container: Container,
  selectedValue: string,
): Promise<void> {
  if (!selectedValue.startsWith('install:')) return;

  const moduleName = selectedValue.slice(8);
  const moduleRegistry = getModuleRegistry(container);
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true } as any);
    return;
  }

  const mod = moduleRegistry.get(moduleName);
  if (!mod || mod.manifest.tier !== 'marketplace') {
    await interaction.reply({ content: 'Module not found or not available for installation.', ephemeral: true } as any);
    return;
  }

  const db = container.resolve(CORE_TOKENS.Db);
  await db.knex('guild_module_states').insert({
    guildId,
    moduleSlug: moduleName,
    enabled: true,
    state: 'active',
    installedAt: new Date(),
  }).onConflict(['guildId', 'moduleSlug']).merge({
    enabled: true,
    state: 'active',
    updatedAt: new Date(),
  });

  const allModules = moduleRegistry.all();
  const installedModules: ModuleInfo[] = [];
  const marketplaceModules: ModuleInfo[] = [];

  for (const m of allModules) {
    const manifest = m.manifest;
    const enabled = await db
      .knex('guild_module_states')
      .where({ guildId, moduleSlug: manifest.name })
      .whereNull('deletedAt')
      .first<{ enabled: boolean; state: string }>()
      .then((row) => {
        if (row === undefined) {
          return manifest.tier === 'core' || manifest.tier === 'standard' || manifest.tier === 'admin';
        }
        return row.enabled === true && row.state === 'active';
      });

    const moduleInfo: ModuleInfo = {
      name: manifest.name,
      displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
      version: manifest.version,
      tier: manifest.tier,
      description: manifest.description,
      logoEmoji: '📦',
      isInstalled: enabled,
      isCore: manifest.tier === 'core' || manifest.tier === 'admin',
    };

    if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
      installedModules.push(moduleInfo);
    } else if (manifest.tier === 'marketplace') {
      marketplaceModules.push(moduleInfo);
    }
  }

  const installedContent = buildInstalledModulesList(installedModules);
  const bannerUrl = getDefaultBannerUrl('Marketplace', DEFAULT_ACCENT_COLOR);
  const installDropdown = stringSelect(BROWSE_DROPDOWN_ID, buildInstallDropdownOptions(marketplaceModules), 'Select a module to install...');

  await interaction.update(createBrowseEmbed(installedContent, installDropdown, bannerUrl) as any as any);
  await interaction.followUp({ content: `✅ Module "${moduleName}" installed successfully!`, ephemeral: true } as any);
}

export async function handleBrowseComponent(
  interaction: StringSelectMenuInteraction,
  container: Container,
): Promise<boolean> {
  if (interaction.customId !== BROWSE_DROPDOWN_ID) return false;

  await interaction.deferUpdate();
  await handleInstallDropdown(interaction, container, interaction.values[0] ?? '');
  return true;
}