// Appendix C #22 — the Components v2 constants have a single source of truth
// (`shared/utils/components-v2.ts`); this module re-exports rather than duplicating them.
export { IS_COMPONENTS_V2, ComponentType } from '../utils/components-v2.js';

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
