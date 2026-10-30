import { definePage, type ModulePageContext, type ModulePageReadModel } from '@workspace/swastik';
import { personaBlocks } from '../blocks/persona.blocks.js';

/**
 * UR-20261027-106 — the persona module owns its page.
 *
 * This composition used to live in `apps/main/src/rendering/page-data.ts` (`persona()`). What it owns
 * is the page: which profiles are shown, what each one claims, and which profile opens. Every fact
 * arrives through the read-model.
 *
 * Three rules the page states, each of them a bug that was fixed once and must not come back:
 *
 *   * UR-20261012-051 — the DEFAULT profile is the identity RUNNING the command, not a profile chosen
 *     for the guild. The old chain asked which persona owned the `persona` MODULE and fell back to
 *     the persona registered for the guild, so `/persona` run from the main bot opened on a persona.
 *   * UR-20261012-054 — CLAIMED ownership. Core is never listed (a core module is shared without
 *     dispute, so listing it under a profile made every profile look identical). A persona's claim is
 *     its BINDING and only its binding: a standard module the main bot has enabled does not become a
 *     persona's by her existing. The main bot's claim is a non-core module enabled for the guild that
 *     NO persona has bound — the moment one does, it leaves the bot's list.
 *   * UR-20261012-029 — a persona is ACTIVE only when its bot is invited and present; presence that
 *     cannot be resolved is reported absent, never assumed.
 */
const MAIN_PROFILE_ID = 'main';

export interface PersonaProfile {
  id: string;
  name: string;
  isMain: boolean;
  applicationId: string;
  shards: string;
  dmBehavior: string;
  statusKind: string;
  statusLabel: string;
  present: boolean;
  hasOAuth: boolean;
  inviteUrl: string;
  moduleCount: number;
  commandCount: number;
}

export interface PersonaTierGroup {
  tier: string;
  modules: { name: string; icon: string }[];
}

export interface PersonaPageData {
  title: string;
  status: 'online' | 'offline';
  currentProfileId: string;
  selectedProfileId: string;
  profiles: PersonaProfile[];
  tiers: PersonaTierGroup[];
  note: string;
}

export const personaPage = definePage({
  id: 'persona',

  async render(
    context: ModulePageContext,
    read: ModulePageReadModel,
  ): Promise<{ data: PersonaPageData; blocks: readonly Record<string, unknown>[] }> {
    const bot = await read.botIdentity();
    const shards = String(await read.shardCount());
    const bindings = await read.personaBindings();
    const registered = await read.registeredPersonas();
    const ownerOf = new Map(bindings.map((binding) => [binding.moduleSlug, binding.personaId]));

    // The identity this PROCESS runs as. Not "the persona registered for this guild" — see 051.
    const resident = await read.residentProfileId();
    const currentProfileId =
      resident !== '' && registered.some((entry) => entry.id === resident)
        ? resident
        : MAIN_PROFILE_ID;

    const all = await read.list();

    // CLAIMED ownership — see 054.
    const claimedFor = async (profileId: string): Promise<typeof all> => {
      const claimed: (typeof all)[number][] = [];
      for (const module of all) {
        if (module.tier === 'core' || module.tier === 'admin') continue;
        if (profileId === MAIN_PROFILE_ID) {
          // A module a persona has bound leaves the bot's list, whatever the guild's state says.
          if (ownerOf.has(module.slug)) continue;
          const guildRow = await read.guildState(module.slug);
          const enabled = guildRow ?? (await read.tierDefault(module.slug));
          if (enabled) claimed.push(module);
          continue;
        }
        if (ownerOf.get(module.slug) === profileId) claimed.push(module);
      }
      return claimed;
    };

    const profileFor = async (
      id: string,
      name: string,
      applicationId: string,
      isMain: boolean,
      dmBehavior: string,
      shardText: string,
      statusKind: string,
      statusLabel: string,
      present: boolean,
      hasOAuth: boolean,
    ): Promise<PersonaProfile> => {
      const owned = await claimedFor(id);
      return {
        id,
        name,
        isMain,
        applicationId,
        shards: shardText,
        dmBehavior,
        statusKind,
        statusLabel,
        present,
        hasOAuth,
        // The invite is the bot's own for the main profile, and absent without a guild or a builder.
        inviteUrl: isMain ? '' : await read.inviteUrl(applicationId, hasOAuth),
        moduleCount: owned.length,
        // The command inventory is gone from this page by request, so a count would be meaningless.
        // Kept at zero rather than removed, so the profile shape stays stable for any other reader.
        commandCount: 0,
      };
    };

    const profiles: PersonaProfile[] = [
      await profileFor(
        MAIN_PROFILE_ID,
        bot.name,
        bot.applicationId,
        true,
        'Prohibited',
        shards,
        bot.online ? 'online' : 'offline',
        bot.online ? 'Online' : 'Offline',
        true,
        false,
      ),
      ...(await Promise.all(
        registered.map(async (entry) => {
          const present = await read.isMember(entry.discordApplicationId);
          // A registered persona reads ONLINE — it exists and is invitable. Whether its bot is in
          // the guild is the separate, honest fact `present` carries.
          const retired = entry.status !== 'active';
          return profileFor(
            entry.id,
            entry.name,
            entry.discordApplicationId,
            false,
            entry.dmBehavior === 'allowed' ? 'Allowed' : 'Prohibited',
            String(entry.shardAllocation),
            retired ? 'retired' : 'online',
            retired ? 'Retired' : 'Online',
            present,
            entry.hasOAuth,
          );
        }),
      )),
    ];

    const selected = context.query;
    const selectedId =
      selected !== undefined && profiles.some((profile) => profile.id === selected)
        ? selected
        : currentProfileId;
    const selectedProfile = profiles.find((profile) => profile.id === selectedId) ?? profiles[0];
    const owned = await claimedFor(selectedProfile?.id ?? MAIN_PROFILE_ID);

    // Only the tiers a profile can CLAIM. Core is absent by design.
    const tiers: PersonaTierGroup[] = [];
    for (const tier of ['standard', 'marketplace']) {
      const modules = await Promise.all(
        owned
          .filter((module) => module.tier === tier)
          .map(async (module) => ({
            name: module.slug,
            icon: await read.moduleIcon(module.iconName),
          })),
      );
      if (modules.length > 0) tiers.push({ tier, modules });
    }

    const data: PersonaPageData = {
      title: 'Active Personas',
      status: bot.online ? 'online' : 'offline',
      currentProfileId,
      selectedProfileId: selectedProfile?.id ?? MAIN_PROFILE_ID,
      profiles,
      tiers,
      note: 'Persona creation and configuration are handled through the Twill registration API.',
    };

    // UR-20261029-116 — the module composes its own content blocks, including the admin-only setup
    // control, which it offers from the standing the framework resolved for this invocation.
    return {
      data,
      blocks: personaBlocks(
        data as unknown as Readonly<Record<string, unknown>>,
        context.profileId,
        // UR-20261030-118 — additive capabilities, guarded: an older host is a degraded page, not a crash.
        context.isAdmin === true,
        context.emoji ?? (() => undefined),
        context.emojiParts ?? (() => undefined),
      ),
    };
  },
});
