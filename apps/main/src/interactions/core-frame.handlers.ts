import type { CommandInteraction, CommandRouter } from '../commands/command-router.js';
import type { RenderMode } from '../rendering/core-renderer.js';
import type { ComponentInteraction, InteractionRegistry } from './interaction-registry.js';
import { textInputModal } from '../shared/utils/components-v2.js';
import { HOME_SELECT_VALUE } from '../shared/constants/index.js';

const MODE_PREFIX = 'dumby:mode:';
const NAV_PREFIX = 'dumby:nav:';
const ACT_PREFIX = 'dumby:act:';
/** UR-20261012-029 — the persona authorization setup card (always private). */
const PERSONA_SETUP_PREFIX = 'dumby:persona-setup:';

const isRenderMode = (value: string | undefined): value is RenderMode =>
  value === 'D' || value === 'M' || value === 'C';

/**
 * §2.4 — a component interaction carries no commandName, so the handler presents it to the router as
 * an already-acknowledged command interaction. `replied: true` makes the router's buffer step edit
 * the existing navigation message rather than reply with a new one (§2.2).
 */
function asPageInteraction(
  interaction: ComponentInteraction,
  commandName: string,
): CommandInteraction {
  const memberPermissions = interaction.memberPermissions;
  const isGuildOwner = interaction.isGuildOwner;
  const applicationId = interaction.applicationId;
  return {
    commandName,
    user: { id: interaction.user.id },
    guildId: interaction.guildId,
    // UR-20261012-054 — the permission context travels with the re-entry. Dropping it made every
    // admin-gated control disappear on the first switch or refresh.
    ...(applicationId !== undefined ? { applicationId } : {}),
    ...(memberPermissions !== undefined ? { memberPermissions } : {}),
    ...(isGuildOwner !== undefined ? { isGuildOwner } : {}),
    // The registry has already acknowledged this component interaction with `deferUpdate`, so a
    // reply or defer here would be a second acknowledgement, which Discord rejects. Only `editReply`
    // should act, and it edits the navigation message in place (§2.2).
    reply: async () => {},
    deferReply: async () => {},
    editReply: interaction.editReply,
    replied: true,
    deferred: false,
  };
}

/**
 * §2.4 / §11.3 — the frame's own controls. Both re-enter the router for the target page, so mode
 * switching and dropdown navigation take the same edit-in-place path as any other page change.
 */
export interface CoreFrameHandlerDeps {
  registry: InteractionRegistry;
  router: CommandRouter;
  /**
   * The router for the application that owns an interaction.
   *
   * The main bot and every hosted persona have their OWN router — the profile, the accent and the
   * command ownership all come from it. The component registry is SHARED, so a control pressed on a
   * persona's page reached the MAIN router and re-rendered as the main bot: amber, with the main
   * bot's module list. That is the reported "clicking Home turns the persona's page amber".
   * Absent, everything falls back to `router`.
   */
  routerFor?: (applicationId: string) => CommandRouter | undefined;
  /** item 8 — builds the private (ephemeral) module-detail card for a module id. */
  moduleInfo?: (
    moduleId: string,
    guildId: string | null,
    invokerId: string,
    /** The invoking surface: 'modules' (the detail card, with its control) or 'browse' (info only). */
    surface?: string,
    /** UR-20261012-060 — the application rendering, so the card's icons resolve. */
    applicationId?: string,
  ) => unknown | Promise<unknown>;
  /** item 9 — installs a marketplace module for the guild (the install-dropdown action). */
  installModule?: (
    moduleId: string,
    guildId: string | null,
    userId: string,
    /** UR-20261012-061 — the application acting, so an OCCUPIED module can be refused by name. */
    applicationId?: string,
  ) => Promise<void>;
  /** UR-20261011-009 — disables/uninstalls a module for the guild (the detail card's control). */
  /**
   * The private confirmation a module change sends. Built by the host, which has the module's display
   * name; the handler only decides WHEN. Returned as a Discord message payload, so the ephemeral flag
   * is the host's to set.
   */
  moduleConfirmation?: (moduleId: string, action: 'installed' | 'disabled') => Promise<unknown>;
  uninstallModule?: (
    moduleId: string,
    guildId: string | null,
    userId: string,
    applicationId?: string,
  ) => Promise<void>;
  /**
   * UR-20261011-018 — the formal Compact (Mode C) confirmation shown after a module is disabled,
   * in place of the refreshed detail card.
   */
  disableConfirmation?: (
    moduleId: string,
    guildId: string | null,
    invokerId: string,
  ) => unknown | Promise<unknown>;
  /**
   * UR-20261012-029 — builds the persona authorization setup card. Offered only from the /persona
   * control the page shows a guild admin; the card itself is private (ephemeral).
   */
  personaSetup?:
    ((applicationId: string, guildId: string | null) => unknown | Promise<unknown>) | undefined;
}

export function registerCoreFrameHandlers(deps: CoreFrameHandlerDeps): void {
  const { registry, moduleInfo, installModule, uninstallModule, disableConfirmation } = deps;
  const { personaSetup } = deps;

  /**
   * Re-enter the router for the ACTING application, not for the process.
   *
   * Every control on every page goes through here, so a persona's own controls render as that persona.
   * Resolving per interaction — rather than once at registration — is what makes that possible: the
   * registry is shared, the routers are not.
   */
  const dispatch = async (
    interaction: ComponentInteraction,
    commandName: string,
    options?: { mode?: RenderMode; page?: number; query?: string },
  ): Promise<void> => {
    const router =
      (interaction.applicationId !== undefined
        ? deps.routerFor?.(interaction.applicationId)
        : undefined) ?? deps.router;
    await router.dispatch(asPageInteraction(interaction, commandName), options);
  };

  registry.register({
    customIdPrefix: MODE_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { mode: parts[3], page: parts[4] };
    },
    execute: async (interaction, context) => {
      const { mode, page } = context as { mode?: string; page?: string };
      if (!isRenderMode(mode) || page === undefined) return;
      await dispatch(interaction, page, { mode });
    },
  });

  // items 11/15/17 - page-declared action controls: paging re-enters the router; the module detail
  // card's uninstall control re-renders that card in place.
  registry.register({
    customIdPrefix: ACT_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { action: parts[3], target: parts[4], page: parts[5] };
    },
    execute: async (interaction, context) => {
      const { action, target, page } = context as {
        action?: string;
        target?: string;
        page?: string;
      };
      if (action === undefined || target === undefined) return;
      if (
        action === 'next' ||
        action === 'prev' ||
        action === 'first' ||
        action === 'search' ||
        action === 'home' ||
        action === 'refresh'
      ) {
        // item 4 — `home` returns to the TARGET page's own main view (e.g. /browse with no query).
        // UR-20261011-008 — `refresh` re-dispatches the TARGET page, re-running its handler so the
        // health report re-gathers its data (the health page's Refresh control).
        // UR-20261011-009 — a trailing page segment pages the target surface (the /modules nav).
        const n = Number(page);
        // UR-20261012-039 — the trailing segment is a page INDEX for paging surfaces, but a
        // NON-numeric one is a page-data selection (the /persona profile switcher), which travels on
        // the query channel so a Refresh keeps the profile the member had chosen.
        const dispatchOptions =
          page === undefined ? undefined : Number.isFinite(n) ? { page: n } : { query: page };
        await dispatch(interaction, target, dispatchOptions);
        return;
      }
      if (action === 'uninstall') {
        // UR-20261011-009 — the module detail card's uninstall/disable control: disable the module
        // for the guild. UR-20261011-018 — replace the card with a formal Compact (Mode C)
        // confirmation, so the operator sees a definitive, professional result.
        if (uninstallModule !== undefined) {
          await uninstallModule(
            target,
            interaction.guildId,
            interaction.user.id,
            interaction.applicationId,
          );
        }
        if (disableConfirmation !== undefined) {
          await interaction.editReply(
            await disableConfirmation(target, interaction.guildId, interaction.user.id),
          );
        } else if (moduleInfo !== undefined) {
          await interaction.editReply(
            await moduleInfo(
              target,
              interaction.guildId,
              interaction.user.id,
              'modules',
              interaction.applicationId,
            ),
          );
        }
        return;
      }
      if (action === 'install') {
        // item 9 — selecting a module in the install dropdown installs it, then the page re-renders
        // so the installed module drops out of the available list.
        const selected = interaction.values?.[0];
        // UR-20261011-006 — the dropdown's permanent first option is Home: selecting it returns to
        // the browse main view (a search reset) and installs nothing.
        const installing =
          selected !== undefined && selected !== HOME_SELECT_VALUE && installModule !== undefined;
        if (installing && selected !== undefined) {
          await installModule(
            selected,
            interaction.guildId,
            interaction.user.id,
            interaction.applicationId,
          );
        }
        // The page first: it is the interaction's one initial response, and the installed module drops
        // out of the available list there. Then the confirmation, as a FOLLOW-UP, so it is private —
        // a change one member made is not an announcement to the channel.
        await dispatch(interaction, 'browse');
        if (installing && selected !== undefined && deps.moduleConfirmation !== undefined) {
          const payload = await deps.moduleConfirmation(selected, 'installed');
          if (payload !== undefined) await interaction.followUp?.(payload);
        }
      }
      if (action === 'profile') {
        // UR-20261012-026 — the /persona profile switcher: re-dispatch the page with the selected
        // persona id, so the board renders that profile's identity and command inventory. The id
        // travels on the page-data query channel (the same one /browse's search reuses).
        const selected = interaction.values?.[0];
        await dispatch(
          interaction,
          'persona',
          selected !== undefined ? { query: selected } : undefined,
        );
        return;
      }

      if (action === 'nav') {
        // item 6 — the DIAL, on the dashboard and on /modules alike. The option's VALUE is the target
        // PAGE (Home carries the reserved sentinel), so no module→page mapping is needed: the page is
        // exactly what the select was built with. The customId names the surface, so one branch serves
        // both dials — validated against the two surfaces that carry one, rather than dispatched
        // verbatim, so a forged id cannot name an arbitrary command.
        const selected = interaction.values?.[0];
        // The value is `<page>:<id>` — the id keeps it unique (a select rejects a repeated value),
        // and the page leads because that is all the handler needs.
        const page =
          selected === undefined || selected === HOME_SELECT_VALUE
            ? 0
            : Number(selected.split(':')[0]);
        const surface = target === 'modules' ? 'modules' : 'dashboard';
        await dispatch(interaction, surface, { page: Number.isFinite(page) ? page : 0 });
        return;
      }
    },
  });

  // UR-20261012-029 — the persona authorization setup card is ALWAYS private (ephemeral), like the
  // module detail card: ack: 'ephemeral' acknowledges it privately before the card is built.
  registry.register({
    customIdPrefix: PERSONA_SETUP_PREFIX,
    ack: 'ephemeral',
    parse: (customId) => {
      const parts = customId.split(':');
      // `dumby:persona-setup:<invoker>:<applicationId>` — the card is built for that application.
      return { invoker: parts[2], applicationId: parts[3] };
    },
    execute: async (interaction, context) => {
      const { applicationId } = context as { applicationId?: string };
      if (personaSetup === undefined) return;
      await interaction.editReply(
        await personaSetup(applicationId ?? '', interaction.guildId ?? null),
      );
    },
  });

  // item 5 — the Discover control opens a modal text input; no acknowledgement (ack: 'none').
  registry.register({
    customIdPrefix: 'dumby:discover:',
    ack: 'none',
    parse: (customId) => {
      const parts = customId.split(':');
      return { target: parts[3] };
    },
    execute: async (interaction) => {
      if (typeof interaction.showModal !== 'function') return;
      await interaction.showModal(
        textInputModal(`dumby:discover:submit:${interaction.user.id}:browse`, 'Discover modules', {
          customId: 'query',
          label: 'Search modules',
          placeholder: 'Type a module name…',
          required: true,
          maxLength: 80,
        }),
      );
    },
  });

  // item 6/8 — the module detail card is ALWAYS private (ephemeral); ack: 'ephemeral'.
  registry.register({
    customIdPrefix: 'dumby:info:',
    ack: 'ephemeral',
    parse: (customId) => {
      const parts = customId.split(':');
      // `dumby:info:<invoker>:<surface>:<moduleId>` — the surface decides whether the detail card
      // carries the uninstall/disable control (the /modules card) or not (the /browse info).
      return { surface: parts[3], moduleId: parts[4] };
    },
    execute: async (interaction, context) => {
      const { surface, moduleId } = context as { surface?: string; moduleId?: string };
      if (moduleId === undefined || moduleInfo === undefined) return;
      await interaction.editReply(
        await moduleInfo(
          moduleId,
          interaction.guildId,
          interaction.user.id,
          surface,
          interaction.applicationId,
        ),
      );
    },
  });

  registry.register({
    customIdPrefix: NAV_PREFIX,
    parse: (customId) => {
      const parts = customId.split(':');
      return { target: parts[3], page: parts[4] };
    },
    execute: async (interaction, context) => {
      const { target, page } = context as { target?: string; page?: string };
      if (target === undefined) return;
      // F-5 — numeric navigation (home / next / prev, and the legacy `page`) carries the target
      // page index in the fourth segment; any other target is a page name from the dropdown.
      if (target === 'home' || target === 'next' || target === 'prev' || target === 'page') {
        const n = target === 'home' ? 0 : Number(page);
        await dispatch(interaction, 'dashboard', { page: Number.isFinite(n) ? n : 0 });
        return;
      }
      await dispatch(interaction, target);
    },
  });
}
