import type { ModuleRegistry } from './registry.js';
import { HealthManifest } from './health/manifest.js';
import * as HealthLifecycle from './health/index.js';
import { HelloManifest } from './hello/manifest.js';
import * as HelloLifecycle from './hello/index.js';
import { CoreAdminManifest } from './core-admin/manifest.js';
import * as CoreAdminLifecycle from './core-admin/index.js';
import { GuildSettingsManifest } from './guild-settings/manifest.js';
import * as GuildSettingsLifecycle from './guild-settings/index.js';
import { UtilityManifest } from './utility/manifest.js';
import * as UtilityLifecycle from './utility/index.js';
import { ModerationManifest } from './moderation/manifest.js';
import * as ModerationLifecycle from './moderation/index.js';
import { AutoModerationManifest } from './auto-moderation/manifest.js';
import * as AutoModerationLifecycle from './auto-moderation/index.js';
import { AntiRaidManifest } from './anti-raid/manifest.js';
import * as AntiRaidLifecycle from './anti-raid/index.js';
import { VerificationManifest } from './verification/manifest.js';
import * as VerificationLifecycle from './verification/index.js';
import { LoggingManifest } from './logging/manifest.js';
import * as LoggingLifecycle from './logging/index.js';
import { WelcomeManifest } from './welcome/manifest.js';
import * as WelcomeLifecycle from './welcome/index.js';
import { LevelingManifest } from './leveling/manifest.js';
import * as LevelingLifecycle from './leveling/index.js';
import { EconomyManifest } from './economy/manifest.js';
import * as EconomyLifecycle from './economy/index.js';
import { StarboardManifest } from './starboard/manifest.js';
import * as StarboardLifecycle from './starboard/index.js';
import { ReactionRolesManifest } from './reaction-roles/manifest.js';
import * as ReactionRolesLifecycle from './reaction-roles/index.js';
import { PollsManifest } from './polls/manifest.js';
import * as PollsLifecycle from './polls/index.js';
import { BirthdaysManifest } from './birthdays/manifest.js';
import * as BirthdaysLifecycle from './birthdays/index.js';
import { TagsManifest } from './tags/manifest.js';
import * as TagsLifecycle from './tags/index.js';
import { RemindersManifest } from './reminders/manifest.js';
import * as RemindersLifecycle from './reminders/index.js';
import { ThreadsManagerManifest } from './threads-manager/manifest.js';
import * as ThreadsManagerLifecycle from './threads-manager/index.js';
import { GiveawaysManifest } from './giveaways/manifest.js';
import * as GiveawaysLifecycle from './giveaways/index.js';
import { TicketsManifest } from './tickets/manifest.js';
import * as TicketsLifecycle from './tickets/index.js';
import { MusicManifest } from './music/manifest.js';
import * as MusicLifecycle from './music/index.js';
import { IntegrationsManifest } from './integrations/manifest.js';
import * as IntegrationsLifecycle from './integrations/index.js';

/**
 * Stage 10 MODULE_DISCOVER: registers all modules.
 *
 * The two Core-tier shipped commands (health, hello) are registered FIRST
 * so their required:true status is guaranteed to gate readiness.
 * The 22 illustrative Standard/Admin skeleton modules follow, proving the
 * module system works end-to-end.
 *
 * Regenerate with: pnpm scaffold:module (scripts/generate-register-all.ts)
 */
export function registerAllModules(registry: ModuleRegistry): void {
  // ── Core-tier shipped commands ────────────────────────────────────────────
  registry.register({
    manifest: HealthManifest,
    onLoad: HealthLifecycle.onLoad,
    onReady: HealthLifecycle.onReady,
    onUnload: HealthLifecycle.onUnload,
  });
  registry.register({
    manifest: HelloManifest,
    onLoad: HelloLifecycle.onLoad,
    onReady: HelloLifecycle.onReady,
    onUnload: HelloLifecycle.onUnload,
  });

  // ── Illustrative module skeletons ─────────────────────────────────────────
  registry.register({
    manifest: CoreAdminManifest,
    onLoad: CoreAdminLifecycle.onLoad,
    onReady: CoreAdminLifecycle.onReady,
    onUnload: CoreAdminLifecycle.onUnload,
  });
  registry.register({
    manifest: GuildSettingsManifest,
    onLoad: GuildSettingsLifecycle.onLoad,
    onReady: GuildSettingsLifecycle.onReady,
    onUnload: GuildSettingsLifecycle.onUnload,
  });
  registry.register({
    manifest: UtilityManifest,
    onLoad: UtilityLifecycle.onLoad,
    onReady: UtilityLifecycle.onReady,
    onUnload: UtilityLifecycle.onUnload,
  });
  registry.register({
    manifest: ModerationManifest,
    onLoad: ModerationLifecycle.onLoad,
    onReady: ModerationLifecycle.onReady,
    onUnload: ModerationLifecycle.onUnload,
  });
  registry.register({
    manifest: AutoModerationManifest,
    onLoad: AutoModerationLifecycle.onLoad,
    onReady: AutoModerationLifecycle.onReady,
    onUnload: AutoModerationLifecycle.onUnload,
  });
  registry.register({
    manifest: AntiRaidManifest,
    onLoad: AntiRaidLifecycle.onLoad,
    onReady: AntiRaidLifecycle.onReady,
    onUnload: AntiRaidLifecycle.onUnload,
  });
  registry.register({
    manifest: VerificationManifest,
    onLoad: VerificationLifecycle.onLoad,
    onReady: VerificationLifecycle.onReady,
    onUnload: VerificationLifecycle.onUnload,
  });
  registry.register({
    manifest: LoggingManifest,
    onLoad: LoggingLifecycle.onLoad,
    onReady: LoggingLifecycle.onReady,
    onUnload: LoggingLifecycle.onUnload,
  });
  registry.register({
    manifest: WelcomeManifest,
    onLoad: WelcomeLifecycle.onLoad,
    onReady: WelcomeLifecycle.onReady,
    onUnload: WelcomeLifecycle.onUnload,
  });
  registry.register({
    manifest: LevelingManifest,
    onLoad: LevelingLifecycle.onLoad,
    onReady: LevelingLifecycle.onReady,
    onUnload: LevelingLifecycle.onUnload,
  });
  registry.register({
    manifest: EconomyManifest,
    onLoad: EconomyLifecycle.onLoad,
    onReady: EconomyLifecycle.onReady,
    onUnload: EconomyLifecycle.onUnload,
  });
  registry.register({
    manifest: StarboardManifest,
    onLoad: StarboardLifecycle.onLoad,
    onReady: StarboardLifecycle.onReady,
    onUnload: StarboardLifecycle.onUnload,
  });
  registry.register({
    manifest: ReactionRolesManifest,
    onLoad: ReactionRolesLifecycle.onLoad,
    onReady: ReactionRolesLifecycle.onReady,
    onUnload: ReactionRolesLifecycle.onUnload,
  });
  registry.register({
    manifest: PollsManifest,
    onLoad: PollsLifecycle.onLoad,
    onReady: PollsLifecycle.onReady,
    onUnload: PollsLifecycle.onUnload,
  });
  registry.register({
    manifest: BirthdaysManifest,
    onLoad: BirthdaysLifecycle.onLoad,
    onReady: BirthdaysLifecycle.onReady,
    onUnload: BirthdaysLifecycle.onUnload,
  });
  registry.register({
    manifest: TagsManifest,
    onLoad: TagsLifecycle.onLoad,
    onReady: TagsLifecycle.onReady,
    onUnload: TagsLifecycle.onUnload,
  });
  registry.register({
    manifest: RemindersManifest,
    onLoad: RemindersLifecycle.onLoad,
    onReady: RemindersLifecycle.onReady,
    onUnload: RemindersLifecycle.onUnload,
  });
  registry.register({
    manifest: ThreadsManagerManifest,
    onLoad: ThreadsManagerLifecycle.onLoad,
    onReady: ThreadsManagerLifecycle.onReady,
    onUnload: ThreadsManagerLifecycle.onUnload,
  });
  registry.register({
    manifest: GiveawaysManifest,
    onLoad: GiveawaysLifecycle.onLoad,
    onReady: GiveawaysLifecycle.onReady,
    onUnload: GiveawaysLifecycle.onUnload,
  });
  registry.register({
    manifest: TicketsManifest,
    onLoad: TicketsLifecycle.onLoad,
    onReady: TicketsLifecycle.onReady,
    onUnload: TicketsLifecycle.onUnload,
  });
  registry.register({
    manifest: MusicManifest,
    onLoad: MusicLifecycle.onLoad,
    onReady: MusicLifecycle.onReady,
    onUnload: MusicLifecycle.onUnload,
  });
  registry.register({
    manifest: IntegrationsManifest,
    onLoad: IntegrationsLifecycle.onLoad,
    onReady: IntegrationsLifecycle.onReady,
    onUnload: IntegrationsLifecycle.onUnload,
  });
}
