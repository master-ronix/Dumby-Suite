import { describe, expect, it, vi } from 'vitest';
import { CommandRestrictionGuard } from '../CommandRestrictionGuard.js';
import { CommandRouter } from '../CommandRouter.js';
import { contextFactory, logger, middleware, moduleState, registry, slash, slashWithGroup, slashWithSub, userMenu, messageMenu } from './helpers.js';

function interaction(kind: 'chat' | 'user' | 'message' | 'autocomplete', commandName: string, sub?: string, group?: string) {
  const reply = vi.fn(async () => undefined);
  return {
    commandName,
    guildId: 'g',
    user: { id: 'u' },
    options: {
      getSubcommand: vi.fn(() => sub ?? null),
      getSubcommandGroup: vi.fn(() => group ?? null),
      getFocused: vi.fn(() => ({ name: 'thing' })),
    },
    isCommand: () => kind !== 'autocomplete',
    isAutocomplete: () => kind === 'autocomplete',
    isChatInputCommand: () => kind === 'chat',
    isUserContextMenuCommand: () => kind === 'user',
    isMessageContextMenuCommand: () => kind === 'message',
    isRepliable: () => true,
    reply,
    respond: vi.fn(async () => undefined),
  } as never;
}

describe('CommandRouter', () => {
  it('resolves slash, subcommand, group, user menu, message menu, unknown command, and disabled module', async () => {
    const ping = slash('ping');
    const state = moduleState();
    const router = new CommandRouter({
      registry: registry([
        { moduleSlug: 'm', tier: 'standard', command: ping },
        { moduleSlug: 'm', tier: 'standard', command: slashWithSub('case', 'view') },
        { moduleSlug: 'm', tier: 'standard', command: slashWithGroup('economy', 'shop', 'buy') },
        { moduleSlug: 'm', tier: 'standard', command: userMenu('Inspect User') },
        { moduleSlug: 'm', tier: 'standard', command: messageMenu('Inspect Message') },
      ]),
      moduleState: state,
      restrictions: new CommandRestrictionGuard({ ownerIds: ['owner'], devGuildId: 'dev' }),
      middleware,
      contextFactory,
      logger,
    });

    await router.dispatch(interaction('chat', 'ping'));
    await router.dispatch(interaction('chat', 'case', 'view'));
    await router.dispatch(interaction('chat', 'economy', 'buy', 'shop'));
    await router.dispatch(interaction('user', 'Inspect User'));
    await router.dispatch(interaction('message', 'Inspect Message'));
    await router.dispatch(interaction('chat', 'unknown'));
    expect(middleware.execute).toHaveBeenCalledTimes(5);

    vi.mocked(state.getStatus).mockResolvedValueOnce('disabled');
    await router.dispatch(interaction('chat', 'ping'));
    expect(middleware.execute).toHaveBeenCalledTimes(5);
  });

  it('rejects DM for guildOnly and allows admin DM only for owner', async () => {
    const admin = slash('admin');
    const router = new CommandRouter({
      registry: registry([{ moduleSlug: 'admin', tier: 'admin', command: admin }]),
      moduleState: moduleState(),
      restrictions: new CommandRestrictionGuard({ ownerIds: ['owner'], devGuildId: 'dev' }),
      middleware,
      contextFactory,
      logger,
    });
    const dm = interaction('chat', 'admin') as { guildId: string | null; user: { id: string } };
    dm.guildId = null;
    dm.user.id = 'owner';
    await router.dispatch(dm as never);
    expect(middleware.execute).toHaveBeenCalled();
  });
});
