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

// UR-20261011-006 — the /browse install dropdown's fixed caps. Discord caps a String Select at 25
// options; one slot is reserved for the permanent Home entry, so the per-page module listing caps
// at 24 and the listing and the dropdown stay in sync (24 modules + Home = 25 options).
export const INSTALL_DROPDOWN_CAP = 25;
export const MARKETPLACE_MODULE_CAP = INSTALL_DROPDOWN_CAP - 1;

/** UR-20261011-006 — the install dropdown's permanent Home option; selecting it returns to the
 *  /browse main view (a search reset) and installs nothing. */
export const HOME_SELECT_VALUE = '__home__';
