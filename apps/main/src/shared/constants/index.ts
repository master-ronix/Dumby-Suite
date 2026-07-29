/**
 * Shared constants (Cluster: Core shared).
 */

/** Discord Components V2 flag (1 << 15 = 32768). Applied to reply flags. */
export const IS_COMPONENTS_V2 = 1 << 15;

/** Discord component type identifiers for Components V2. */
export const ComponentType = {
  /** Action Row — type 1 (not used in Components V2). */
  ActionRow: 1,
  /** Text Display — type 10. */
  TextDisplay: 10,
  /** Section — type 9. */
  Section: 9,
  /** Media Gallery — type 12. */
  MediaGallery: 12,
  /** Separator — type 14. */
  Separator: 14,
  /** Content Inventory Item — type 16. */
  ContentInventoryItem: 16,
  /** Container — type 17 (used as outer wrapper in Components V2). */
  Container: 17,
} as const;

/** RBAC role hierarchy (OWNER > ADMIN > MOD > HELPER > MEMBER > RESTRICTED). */
export const RBAC_ROLES = ['OWNER', 'ADMIN', 'MOD', 'HELPER', 'MEMBER', 'RESTRICTED'] as const;

/** Module tiers in order of privilege. */
export const MODULE_TIERS = ['admin', 'core', 'standard', 'marketplace'] as const;

/** Maximum Discord embed character limits. */
export const DISCORD_LIMITS = {
  MessageContent: 2000,
  EmbedTitle: 256,
  EmbedDescription: 4096,
  EmbedFieldName: 256,
  EmbedFieldValue: 1024,
  EmbedFooterText: 2048,
  EmbedAuthorName: 256,
} as const;
