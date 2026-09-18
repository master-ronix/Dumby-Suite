/**
 * Dashboard command handler — central navigation hub (Cluster: Frame).
 * Implements the /dashboard command with Components V2 embed,
 * edit-in-place navigation, and interactive dropdown per interface.md Division 1.
 */
import type { StringSelectMenuInteraction, APIMessage } from 'discord.js';
import {
  ComponentType,
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
import { ModuleRegistry } from '../../../modules/registry.js';
import { CORE_TOKENS } from '../../../di/tokens.js';
import type { Container } from '../../../di/container.js';

const NAV_DROPDOWN_ID = 'dashboard:nav:dropdown';
const MESSAGE_KEY_PREFIX = 'dashboard:message:';

interface DashboardMessage {
  channelId: string;
  messageId: string;
  userId: string;
  currentPage: string;
  updatedAt: number;
}

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

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
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

function buildNavDropdownOptions(
  currentPage: string,
  installedModules: ModuleInfo[],
  marketplaceModules: ModuleInfo[],
): Array<{ label: string; value: string; description?: string; emoji?: string; default?: boolean }> {
  const options: Array<{ label: string; value: string; description?: string; emoji?: string; default?: boolean }> = [
    {
      label: 'Dashboard (Home)',
      value: 'dashboard',
      description: 'Return to the dashboard home page',
      emoji: '🏠',
      default: currentPage === 'dashboard',
    },
  ];

  for (const mod of installedModules) {
    options.push({
      label: mod.displayName,
      value: `module:${mod.name}`,
      description: `✅ ${mod.description.slice(0, 90)}`,
      emoji: mod.logoEmoji,
      default: currentPage === `module:${mod.name}`,
    });
  }

  for (const mod of marketplaceModules) {
    options.push({
      label: mod.displayName,
      value: `module:${mod.name}`,
      description: `🛒 ${mod.description.slice(0, 90)}`,
      emoji: mod.logoEmoji,
      default: currentPage === `module:${mod.name}`,
    });
  }

  return options.slice(0, 25);
}

function createDashboardEmbed(
  pageName: string,
  content: string,
  navDropdown: ReturnType<typeof stringSelect>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const components = [
    mediaGallery(bannerUrl, 'Dumby banner'),
    separator(),
    createTitleBlock(pageName),
    separator(),
    textDisplay(content),
    separator(),
    navDropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createModulePageEmbed(
  module: ModuleInfo,
  content: string,
  navDropdown: ReturnType<typeof stringSelect>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const components = [
    mediaGallery(bannerUrl, `${module.displayName} banner`),
    separator(),
    textDisplay(`Dumby | ${module.displayName}\n-# Developed by Quixotic Mnemonics v${module.version}`),
    separator(),
    textDisplay(content),
    separator(),
    navDropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

export const dashboardCommand: CommandDefinition = {
  data: {
    name: 'dashboard',
    description: 'Opens the Dumby dashboard — the central navigation hub for all core commands and module pages.',
  },
  moduleId: 'dashboard',
  guildOnly: true,
  permissionDeclared: true,
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as import('discord.js').ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await cmdInteraction.reply({
        content: 'Internal error: DI container not available',
        ephemeral: true,
      } as any);
      return;
    }

    const moduleRegistry = getModuleRegistry(container);
    const guildId = cmdInteraction.guildId;
    const userId = cmdInteraction.user.id;
    const channelId = cmdInteraction.channelId;

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

    const currentPage = 'dashboard';
    const bannerUrl = getDefaultBannerUrl('Dashboard', DEFAULT_ACCENT_COLOR);
    const navDropdown = stringSelect(NAV_DROPDOWN_ID, buildNavDropdownOptions(currentPage, installedModules, marketplaceModules), 'Navigate to...');

    const coreCommandsList = installedModules
      .filter((m) => m.isCore)
      .map((m) => `/${m.name}   — ${m.description}`)
      .join('\n');

    const content = `${createSectionHeader('📋', 'Core Commands').content}\n\n${coreCommandsList}`;

    const message = await cmdInteraction.reply({
      ...createDashboardEmbed('Dashboard', content, navDropdown, bannerUrl),
      fetchReply: true,
    } as any);

    const msg = message as unknown as APIMessage;
    const messageData: DashboardMessage = {
      channelId,
      messageId: msg.id,
      userId,
      currentPage,
      updatedAt: Date.now(),
    };

    try {
      const cache = container.resolve(CORE_TOKENS.Cache);
      await cache.set(`${MESSAGE_KEY_PREFIX}${channelId}:${userId}`, JSON.stringify(messageData), 3600000);
    } catch {
    }
  },
};

async function handleNavDropdown(
  interaction: StringSelectMenuInteraction,
  container: Container,
  selectedValue: string,
): Promise<void> {
  const moduleRegistry = getModuleRegistry(container);
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const channelId = interaction.channelId;

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

  let content = '';
  let pageName = 'Dashboard';
  let bannerUrl = getDefaultBannerUrl('Dashboard', DEFAULT_ACCENT_COLOR);

  if (selectedValue === 'dashboard') {
    const coreCommandsList = installedModules
      .filter((m) => m.isCore)
      .map((m) => `/${m.name}   — ${m.description}`)
      .join('\n');
    content = `${createSectionHeader('📋', 'Core Commands').content}\n\n${coreCommandsList}`;
  } else if (selectedValue.startsWith('module:')) {
    const moduleName = selectedValue.slice(7);
    const module = installedModules.find((m) => m.name === moduleName) || marketplaceModules.find((m) => m.name === moduleName);

    if (module) {
      pageName = module.displayName;
      bannerUrl = getDefaultBannerUrl(module.displayName, DEFAULT_ACCENT_COLOR);
      content = `${module.logoEmoji} ${module.displayName}\n\nDescription: ${module.description}\n\nTier: ${module.tier}\nVersion: ${module.version}\nStatus: ${module.isInstalled ? '✅ Enabled' : '🛒 Available in Marketplace'}`;
    } else {
      content = 'Module not found.';
    }
  }

  const navDropdown = stringSelect(NAV_DROPDOWN_ID, buildNavDropdownOptions(selectedValue, installedModules, marketplaceModules), 'Navigate to...');

  let embed: ReturnType<typeof buildComponentsV2>;
  if (selectedValue === 'dashboard') {
    embed = createDashboardEmbed(pageName, content, navDropdown, bannerUrl);
  } else {
    const module = installedModules.find((m) => `module:${m.name}` === selectedValue) || marketplaceModules.find((m) => `module:${m.name}` === selectedValue);
    embed = createModulePageEmbed(module!, content, navDropdown, bannerUrl);
  }

  await interaction.update(embed as any);

  try {
    const cache = container.resolve(CORE_TOKENS.Cache);
    const messageData: DashboardMessage = {
      channelId,
      messageId: interaction.message?.id ?? '',
      userId,
      currentPage: selectedValue,
      updatedAt: Date.now(),
    };
    await cache.set(`${MESSAGE_KEY_PREFIX}${channelId}:${userId}`, JSON.stringify(messageData), 3600000);
  } catch {
  }
}

export async function handleDashboardComponent(
  interaction: StringSelectMenuInteraction,
  container: Container,
): Promise<boolean> {
  if (interaction.customId !== NAV_DROPDOWN_ID) return false;

  await interaction.deferUpdate();
  await handleNavDropdown(interaction, container, interaction.values[0] ?? '');
  return true;
}