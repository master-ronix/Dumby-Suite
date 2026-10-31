export type {
  ModuleCommandManifest,
  ModuleLifecycle,
  ModuleManifest,
  ModuleTier,
  SwastikModule,
} from './manifest.js';
export { defineModule, moduleTiers, moduleManifestSchema } from './manifest.js';
export { validateManifest } from './validate.js';
export type {
  CommandContext,
  ExecutionIdentity,
  ModuleStanding,
  CommandDeclaration,
  CommandHandler,
  CommandPageData,
  CommandPermissionsDeclaration,
  CommandRbacRequirement,
} from './commands.js';
export { defineCommand } from './commands.js';
export {
  assertCatalogCoversEvents,
  defineEvent,
  EventCatalogError,
  type EventCatalogEntry,
} from './events.js';
export type { ModuleEntryPoint, ModuleExecutionContext, ModuleContextStore } from './context.js';
export {
  currentModuleContext,
  installModuleContextStore,
  requireModuleContext,
  runWithModuleContext,
} from './context.js';
export {
  baselineCapabilities,
  coreOnlyCapabilities,
  moduleCapabilities,
  type GlobalDataDelivery,
  type GlobalDataEmit,
  type JsonValue,
  type ModuleCapability,
  type ModuleRuntime,
  type ModuleRuntimeExtras,
} from './capabilities.js';
export {
  definePage,
  type ActingProfileFacts,
  type GuildCounts,
  type HostProcessFacts,
  type PendingQueueEntry,
  type PersonaBinding,
  type PersonaRecord,
  type ModulePage,
  type ModulePageContext,
  type ModulePageReadModel,
  type ModuleSummary,
  type SubsystemState,
} from './pages.js';

export { modulePageNavigation, romanNumeral, type PageSlide } from './paging.js';

/**
 * UR-20261031-120 — the Components V2 primitive vocabulary.
 *
 * A module returns DATA and BLOCKS, and the framework renders them. That left one surface unable to
 * leave the core: a module-specific card that builds a message directly (`persona-setup`) could not
 * move into its module without importing the core, and the import gate refuses exactly that.
 *
 * The operator's decision: the SDK owns the vocabulary, and rendering stays in the core as a library
 * modules call. So the primitives live here, a module imports them from `@workspace/swastik`, and the
 * core imports the same file — one definition, no duplication, no core dependency for a module.
 */
export {
  textDisplay,
  mediaGallery,
  separator,
  container,
  stringSelect,
  userSelect,
  roleSelect,
  mentionableSelect,
  channelSelect,
  button,
  linkButton,
  actionRow,
  thumbnail,
  section,
  textInputModal,
  multiInputModal,
  buildComponentsV2,
  createBannerMediaGallery,
  getDefaultBannerUrl,
  createTitleBlock,
  createMarketplaceTitleBlock,
  createSectionHeader,
  createKeyValueDisplay,
  IS_COMPONENTS_V2,
  EPHEMERAL,
  ComponentType,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PERSONA_ACCENT,
  type ComponentTypeValue,
  type ComponentBase,
  type TextDisplayComponent,
  type MediaGalleryComponent,
  type SeparatorComponent,
  type ContainerComponent,
  type StringSelectComponent,
  type EntitySelectComponent,
  type ButtonComponent,
  type ActionRowComponent,
  type ThumbnailComponent,
  type SectionComponent,
  type Component,
  type ComponentsV2Message,
  type ModalTextInput,
  type ModalPayload,
} from './components-v2.js';
/**
 * UR-20261031-122 — the sealed-envelope helper.
 *
 * Six of the persona domain's imports were this one file: a persona's bot token and client secret are
 * stored sealed, and a module that owns its own credentials has to be able to open them. It lives in
 * the SDK for the same reason the Components V2 vocabulary does — one definition, imported by the core
 * and by a module, with no core dependency for the module.
 */
export {
  toBase64,
  fromBase64,
  rootKeyFromBase64,
  randomRootKey,
  seal,
  open,
  rotate,
  keyIdsEqual,
  ENVELOPE_ALGORITHM,
  ROOT_KEY_BYTE_LENGTH,
  DEK_BYTE_LENGTH,
  IV_BYTE_LENGTH,
  type SealedEnvelope,
  type EnvelopeRootKey,
} from './envelope.js';
