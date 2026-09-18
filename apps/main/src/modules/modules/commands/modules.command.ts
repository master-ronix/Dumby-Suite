/**
 * Modules command handler — module management (Cluster: Frame).
 * Implements the /modules command with Components V2 embed per interface.md Division 7.
 */
import type { StringSelectMenuInteraction, ButtonInteraction, APIMessage } from 'discord.js';
import type { Component } from '../../../shared/utils/components-v2.js';
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
import { ModuleRegistry } from '../../../modules/registry.js';
import { CORE_TOKENS } from '../../../di/tokens.js';
import type { Container } from '../../../di/container.js';

const MODULES_LIST_DROPDOWN_ID = 'modules:list:dropdown';
const MODULES_DETAIL_DROPDOWN_ID = 'modules:detail:dropdown';
const MODULES_UNINSTALL_BUTTON_PREFIX = 'modules:uninstall:';

interface ModuleInfo {
  name: string;
  displayName: string;
  version: string;
  tier: string;
  description: string;
  logoEmoji: string;
  isInstalled: boolean;
  isCore: boolean;
  commands: string[];
  installedAt?: Date;
}

function getModuleRegistry(container: Container): ModuleRegistry {
  return container.resolve<ModuleRegistry>(CORE_TOKENS.ModuleRegistry);
}

function buildInstalledModulesList(modules: ModuleInfo[]): string {
  if (modules.length === 0) {
    return 'No modules installed.';

  return modules
    .map((m) => `${m.logoEmoji} ${m.name.padEnd(15)} v${m.version.padEnd(7)} ${m.tier.padEnd(8)} — ${m.description}`)
    .join('\n');
}

function buildDetailDropdownOptions(
  installedModules: ModuleInfo[],
): Array<{ label: string; value: string; description?: string; emoji?: string }> {
  return installedModules.slice(0, 25).map((mod) => ({
    label: mod.displayName,
    value: `detail:${mod.name}`,
    description: `✅ ${mod.description.slice(0, 90)}`,
    emoji: mod.logoEmoji,
  }));
}

function createModulesListEmbed(
  installedContent: string,
  detailDropdown: ReturnType<typeof stringSelect>,
  bannerUrl: string,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const components: Component[] = [
    mediaGallery(bannerUrl, 'Modules banner'),
    separator(),
    createTitleBlock('Modules'),
    separator(),
    createSectionHeader('📦', 'Installed & Standard-Tier Modules'),
    textDisplay(installedContent),
    separator(),
    textDisplay('Select an installed module to view details:'),
    detailDropdown,
  ];

  return buildComponentsV2([container(components, accentColor)]);
}

function createModuleDetailEmbed(
  module: ModuleInfo,
  bannerUrl: string,
  navDropdown: ReturnType<typeof stringSelect>,
  accentColor = DEFAULT_ACCENT_COLOR,
): ReturnType<typeof buildComponentsV2> {
  const status = module.isCore ? '✅ Enabled (Core)' : module.isInstalled ? '✅ Enabled' : '🛒 Available';
  const coreBadge = module.isCore ? ' [CORE]' : '';

  const components: Component[] = [
    mediaGallery(bannerUrl, `${module.displayName} banner`),
    separator(),
    textDisplay(`Dumby | ${module.displayName}\n-# Developed by Quixotic Mnemonics v${module.version}`),
    separator(),
    textDisplay(`${module.logoEmoji} ${module.displayName}`),
    separator(),
    textDisplay(`Description: ${module.description}\n\nTier: ${module.tier}${coreBadge}\nVersion: ${module.version}\nDeveloper: Quixotic Mnemonics\nCommand Count: ${module.commands.length} (${module.commands.join(', ')})\nStatus: ${status}\nInstalled: ${module.installedAt?.toISOString().slice(0, 19) ?? 'Unknown'} UTC`),
    separator(),
  ];

  if (!module.isCore) {
    components.push(actionRow([button(`${MODULES_UNINSTALL_BUTTON_PREFIX}${module.name}`, 'Uninstall', 4)]));
    components.push(separator());


  components.push(navDropdown);

  return buildComponentsV2([container(components, accentColor)]);
}

export const modulesCommand: CommandDefinition = {
  data: {
    name: 'modules',
    description: 'View activated/installed/standard-tier modules and manage them.',
  },
  moduleId: 'modules',
  guildOnly: true,
  permissionDeclared: true,
  // @ts-ignore - function signature contravariance
  async execute(interaction: unknown): Promise<void> {
    const cmdInteraction = interaction as import('discord.js').ChatInputCommandInteraction;
    const container = (cmdInteraction as unknown as { client?: { container?: Container } }).client?.container;
    if (!container) {
      await cmdInteraction.reply({ content: 'Internal error: DI container not available', ephemeral: true } as any);
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
          .first<{ enabled: boolean; state: string; installedAt?: Date }>();

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

    for (const mod of allModules) {
      const manifest = mod.manifest;
      const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
      const row = guildId ? await container.resolve(CORE_TOKENS.Db)
        .knex('guild_module_states')
        .where({ guildId, moduleSlug: manifest.name })
        .whereNull('deletedAt')
        .first<{ installedAt?: Date }>() : null;

      const baseModule = {
        name: manifest.name,
        displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
        version: manifest.version,
        tier: manifest.tier,
        description: manifest.description,
        logoEmoji: '📦',
        isInstalled: enabled,
        isCore: manifest.tier === 'core' || manifest.tier === 'admin',
        commands: manifest.commands.map((c) => `/${c.name}`),
      };
      const targetModule = row?.installedAt !== undefined
        ? { ...baseModule, installedAt: row.installedAt }
        : baseModule;

      if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
        installedModules.push(targetModule);
      }
    }

    const installedContent = buildInstalledModulesList(installedModules);
    const bannerUrl = getDefaultBannerUrl('Modules', DEFAULT_ACCENT_COLOR);
    const detailDropdown = stringSelect(MODULES_DETAIL_DROPDOWN_ID, buildDetailDropdownOptions(installedModules), 'Select module for details...');

    const message = await cmdInteraction.reply({
      ...createModulesListEmbed(installedContent, detailDropdown, bannerUrl),
      fetchReply: true,
    } as any);

    const msg = message as unknown as APIMessage;
    try {
      const cache = container.resolve(CORE_TOKENS.Cache);
      await cache.set(`modules:message:${channelId}:${userId}`, JSON.stringify({
        channelId,
        messageId: msg.id,
        userId,
        guildId,
        type: 'list',
      }), 3600000);
    } catch {
    }
  },
};

// @ts-ignore - TypeScript control flow analysis limitation with async functions
async function handleModulesComponent(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  container: Container,
): Promise<boolean> {
  let handled = false;
    const cache = container.resolve(CORE_TOKENS.Cache);
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const customId = interaction.customId;

    const moduleRegistry = getModuleRegistry(container);

    const isModuleEnabledInGuild = async (moduleId: string, guildId: string | null): Promise<boolean> => {
      if (!guildId) return false;
      try {
        const db = container.resolve(CORE_TOKENS.Db);
        const row = await db
          .knex('guild_module_states')
          .where({ guildId, moduleSlug: moduleId })
          .whereNull('deletedAt')
          .first<{ enabled: boolean; state: string; installedAt?: Date }>();

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

    if (interaction.isStringSelectMenu()) {
      if (customId === MODULES_DETAIL_DROPDOWN_ID) {
        const value = interaction.values[0] ?? '';
        if (value.startsWith('detail:')) {
          const moduleName = value.slice(7);
          const allModules = moduleRegistry.all();

          let targetModule: ModuleInfo | undefined;
          for (const mod of allModules) {
            const manifest = mod.manifest;
            const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
            if (manifest.name === moduleName && (enabled || manifest.tier === 'core' || manifest.tier === 'admin')) {
              const row = guildId ? await container.resolve(CORE_TOKENS.Db)
                .knex('guild_module_states')
                .where({ guildId, moduleSlug: manifest.name })
                .whereNull('deletedAt')
                .first<{ installedAt?: Date }>() : null;

              const baseModule = {
                name: manifest.name,
                displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                version: manifest.version,
                tier: manifest.tier,
                description: manifest.description,
                logoEmoji: '📦',
                isInstalled: enabled,
                isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                commands: manifest.commands.map((c) => `/${c.name}`),
              };
              targetModule = row?.installedAt !== undefined
                ? { ...baseModule, installedAt: row.installedAt }
                : baseModule;
              break;
            }
          }

          if (targetModule) {
            const installedModules: ModuleInfo[] = [];
            for (const mod of allModules) {
              const manifest = mod.manifest;
              const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
              if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
                installedModules.push({
                  name: manifest.name,
                  displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                  version: manifest.version,
                  tier: manifest.tier,
                  description: manifest.description,
                  logoEmoji: '📦',
                  isInstalled: enabled,
                  isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                  commands: manifest.commands.map((c) => `/${c.name}`),
                });
              }

              const navDropdown = stringSelect(MODULES_LIST_DROPDOWN_ID, [
                { label: 'Dashboard (Home)', value: 'dashboard', description: 'Return to the dashboard home page', emoji: '🏠' },
                ...installedModules.map((m) => ({
                  label: m.displayName,
                  value: `detail:${m.name}`,
                  description: `✅ ${m.description.slice(0, 90)}`,
                  emoji: m.logoEmoji,
                })),
              ], 'Navigate to...');

              const bannerUrl = getDefaultBannerUrl(targetModule.displayName, DEFAULT_ACCENT_COLOR);
              const embed = createModuleDetailEmbed(targetModule, bannerUrl, navDropdown);
              await interaction.update(embed as any);
            }
          }
          return true;
        }

        if (customId === MODULES_LIST_DROPDOWN_ID) {
          const value = interaction.values[0] ?? '';
          if (value === 'dashboard') {
            const allModules = moduleRegistry.all();
            const installedModules: ModuleInfo[] = [];
            for (const mod of allModules) {
              const manifest = mod.manifest;
              const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
              if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
                installedModules.push({
                  name: manifest.name,
                  displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                  version: manifest.version,
                  tier: manifest.tier,
                  description: manifest.description,
                  logoEmoji: '📦',
                  isInstalled: enabled,
                  isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                  commands: manifest.commands.map((c) => `/${c.name}`),
                });
              }

              const installedContent = buildInstalledModulesList(installedModules);
              const bannerUrl = getDefaultBannerUrl('Modules', DEFAULT_ACCENT_COLOR);
              const detailDropdown = stringSelect(MODULES_DETAIL_DROPDOWN_ID, buildDetailDropdownOptions(installedModules), 'Select module for details...');
              const embed = createModulesListEmbed(installedContent, detailDropdown, bannerUrl);
              await interaction.update(embed as any);
            }
            } else if (value.startsWith('detail:')) {
              const moduleName = value.slice(7);
              const allModules = moduleRegistry.all();

              let targetModule: ModuleInfo | undefined;
              for (const mod of allModules) {
                const manifest = mod.manifest;
                const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
                if (manifest.name === moduleName && (enabled || manifest.tier === 'core' || manifest.tier === 'admin')) {
                  const row = guildId ? await container.resolve(CORE_TOKENS.Db)
                    .knex('guild_module_states')
                    .where({ guildId, moduleSlug: manifest.name })
                    .whereNull('deletedAt')
                    .first<{ installedAt?: Date }>() : null;

                  const baseModule = {
                    name: manifest.name,
                    displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                    version: manifest.version,
                    tier: manifest.tier,
                    description: manifest.description,
                    logoEmoji: '📦',
                    isInstalled: enabled,
                    isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                    commands: manifest.commands.map((c) => `/${c.name}`),
                  };
                  targetModule = row?.installedAt !== undefined
                    ? { ...baseModule, installedAt: row.installedAt }
                    : baseModule;
                  break;
                }
              }

              if (targetModule) {
                const installedModules: ModuleInfo[] = [];
                for (const mod of allModules) {
                  const manifest = mod.manifest;
                  const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
                  if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
                    installedModules.push({
                      name: manifest.name,
                      displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                      version: manifest.version,
                      tier: manifest.tier,
                      description: manifest.description,
                      logoEmoji: '📦',
                      isInstalled: enabled,
                      isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                      commands: manifest.commands.map((c) => `/${c.name}`),
                    });
                  }

                  const navDropdown = stringSelect(MODULES_LIST_DROPDOWN_ID, [
                    { label: 'Dashboard (Home)', value: 'dashboard', description: 'Return to the dashboard home page', emoji: '🏠' },
                    ...installedModules.map((m) => ({
                      label: m.displayName,
                      value: `detail:${m.name}`,
                      description: `✅ ${m.description.slice(0, 90)}`,
                      emoji: m.logoEmoji,
                    })),
                  ], 'Navigate to...');

                  const bannerUrl = getDefaultBannerUrl(targetModule.displayName, DEFAULT_ACCENT_COLOR);
                  const embed = createModuleDetailEmbed(targetModule, bannerUrl, navDropdown);
                  await interaction.update(embed as any);
                }
              }
            }
            return true;
          }
        }

        if (interaction.isButton()) {
          if (customId.startsWith(MODULES_UNINSTALL_BUTTON_PREFIX)) {
            const moduleName = customId.slice(MODULES_UNINSTALL_BUTTON_PREFIX.length);
            const db = container.resolve(CORE_TOKENS.Db);
            const guildId = interaction.guildId!;

            await db.knex('guild_module_states')
              .where({ guildId, moduleSlug: moduleName })
              .whereNull('deletedAt')
              .update({ enabled: false, state: 'disabled', updatedAt: new Date() });

            await interaction.reply({ content: `Module "${moduleName}" has been disabled.`, ephemeral: true });

            const allModules = moduleRegistry.all();
            const installedModules: ModuleInfo[] = [];
            for (const mod of allModules) {
              const manifest = mod.manifest;
              const enabled = await isModuleEnabledInGuild(manifest.name, guildId);
              if (enabled || manifest.tier === 'core' || manifest.tier === 'admin') {
                installedModules.push({
                  name: manifest.name,
                  displayName: manifest.name.charAt(0).toUpperCase() + manifest.name.slice(1).replace(/-/g, ' '),
                  version: manifest.version,
                  tier: manifest.tier,
                  description: manifest.description,
                  logoEmoji: '📦',
                  isInstalled: enabled,
                  isCore: manifest.tier === 'core' || manifest.tier === 'admin',
                  commands: manifest.commands.map((c) => `/${c.name}`),
                });
              }

            const installedContent = buildInstalledModulesList(installedModules);
            const bannerUrl = getDefaultBannerUrl('Modules', DEFAULT_ACCENT_COLOR);
            const detailDropdown = stringSelect(MODULES_DETAIL_DROPDOWN_ID, buildDetailDropdownOptions(installedModules), 'Select module for details...');
            const embed = createModulesListEmbed(installedContent, detailDropdown, bannerUrl);
            await interaction.message?.edit(embed as any);
            return true;
          }
        }

      }
    }
return false;
}

export { handleModulesComponent };