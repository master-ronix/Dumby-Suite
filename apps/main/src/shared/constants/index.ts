export const IS_COMPONENTS_V2 = 1 << 15;

export const ComponentType = {
  ActionRow: 1,
  TextDisplay: 10,
  Section: 9,
  MediaGallery: 12,
  Separator: 14,
  ContentInventoryItem: 16,
  Container: 17,
} as const;

export const RBAC_ROLES = ['OWNER', 'ADMIN', 'MOD', 'HELPER', 'MEMBER', 'RESTRICTED'] as const;

export const MODULE_TIERS = ['admin', 'core', 'standard', 'marketplace'] as const;

export const DISCORD_LIMITS = {
  MessageContent: 2000,
  EmbedTitle: 256,
  EmbedDescription: 4096,
  EmbedFieldName: 256,
  EmbedFieldValue: 1024,
  EmbedFooterText: 2048,
  EmbedAuthorName: 256,
} as const;
