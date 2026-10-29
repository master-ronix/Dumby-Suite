import { describe, test, expect } from 'vitest';
import { personaPage } from '@module-persona-page';
import type { ModulePageReadModel, ModuleSummary, PersonaRecord } from '@workspace/swastik';

/**
 * UR-20261027-106 — the persona module's OWN page. Three rules it must keep: the default profile is
 * the identity RUNNING the command (051), ownership is CLAIMED and core is never listed (054), and a
 * persona is active only when its bot is present (029).
 */
const modules: readonly ModuleSummary[] = [
  { slug: 'health', tier: 'core', description: 'h', commands: [] },
  { slug: 'permit', tier: 'admin', description: 'p', commands: [] },
  {
    slug: 'hello-world',
    tier: 'standard',
    description: 's',
    commands: [],
    iconName: 'dumby_hello',
  },
  { slug: 'shop', tier: 'marketplace', description: 'm', commands: [] },
];

const magma: PersonaRecord = {
  id: 'p-1',
  name: 'Magma',
  discordApplicationId: 'app-2',
  boundGuildId: 'g1',
  dmBehavior: 'allowed',
  shardAllocation: 1,
  status: 'active',
  hasOAuth: true,
  oauthVerified: true,
};

interface Over {
  resident?: string;
  registered?: PersonaRecord[];
  bindings?: { moduleSlug: string; personaId: string }[];
  member?: boolean;
  guildState?: Record<string, boolean | undefined>;
  tierDefault?: Record<string, boolean>;
}

function readModel(over: Over = {}): ModulePageReadModel {
  const guildState = over.guildState ?? {};
  const tierDefault = over.tierDefault ?? {};
  return {
    list: async () => modules,
    installState: async () => true,
    installedAt: async () => undefined,
    ownedByCaller: async () => true,
    commandNames: async () => new Map(),
    commandStatus: async () => 'enabled',
    markerIcon: async () => 'MARKER',
    moduleIcon: async (iconName) => (iconName === undefined ? 'FALLBACK' : `[${iconName}]`),
    probe: async () => ({ database: 'connected', redis: 'connected' }),
    actingProfile: async () => ({ profileId: 'main', gatewayReady: true, loadedModules: [] }),
    heldModules: async () => [],
    shardCount: async () => 2,
    guilds: async () => ({ total: 0, source: 'cache' }),
    hostProcess: () => ({
      uptimeSeconds: 0,
      nodeVersion: 'v20.20.2',
      memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
    }),
    pendingQueue: async () => [],
    holder: async () => undefined,
    guildState: async (slug) => guildState[slug],
    tierDefault: async (slug) => tierDefault[slug] ?? slug !== 'shop',
    enabledByDefault: async () => true,
    profileLabel: async (id) => (id === 'main' ? 'Dumby Profile' : 'Magma'),
    personaBindings: async () => over.bindings ?? [],
    registeredPersonas: async () => over.registered ?? [],
    residentProfileId: async () => over.resident ?? '',
    botIdentity: async () => ({ name: 'Dumby', applicationId: 'app-1', online: true }),
    isMember: async () => over.member ?? true,
    inviteUrl: async (applicationId, withOAuth) =>
      `https://discord.test/${applicationId}${withOAuth ? '?oauth=1' : ''}`,
  };
}

const ctx = (query?: string) => ({
  guildId: 'g1',
  applicationId: 'app-1',
  profileId: 'main',
  page: 0,
  ...(query !== undefined ? { query } : {}),
  // UR-20261029-116 — the standing and the emoji resolvers the page is handed at dispatch.
  isAdmin: true,
  emoji: (): string | undefined => undefined,
  emojiParts: (): { id: string; name: string } | undefined => undefined,
});

/** The page returns { data, blocks }; these cases assert the DATA it composes. */
async function renderData(
  context: ReturnType<typeof ctx>,
  read: ModulePageReadModel,
): Promise<Record<string, unknown>> {
  const result = (await personaPage.render(context, read)) as { data: Record<string, unknown> };
  return result.data;
}

describe('persona module page — the composition that moved out of page-data.ts', () => {
  test('the main profile is always first, named, and carries no invite', async () => {
    const data = await renderData(ctx(), readModel());
    expect(data.title).toBe('Active Personas');
    expect(data.status).toBe('online');
    expect(data.profiles[0]).toMatchObject({
      id: 'main',
      name: 'Dumby',
      isMain: true,
      applicationId: 'app-1',
      inviteUrl: '',
      shards: '2',
      dmBehavior: 'Prohibited',
    });
  });

  test('a registered persona reads Online, with its invite and its DM behaviour', async () => {
    const data = await renderData(ctx(), readModel({ registered: [magma] }));
    const profile = data.profiles.find((entry) => entry.id === 'p-1');
    expect(profile).toMatchObject({
      name: 'Magma',
      statusLabel: 'Online',
      dmBehavior: 'Allowed',
      shards: '1',
      hasOAuth: true,
      inviteUrl: 'https://discord.test/app-2?oauth=1',
    });
  });

  test('a retired persona reads Retired, and an absent bot is reported absent', async () => {
    const retired: PersonaRecord = { ...magma, status: 'retired' };
    const data = await renderData(ctx(), readModel({ registered: [retired], member: false }));
    const profile = data.profiles.find((entry) => entry.id === 'p-1');
    expect(profile?.statusLabel).toBe('Retired');
    expect(profile?.statusKind).toBe('retired');
    expect(profile?.present).toBe(false);
  });

  test('the default profile is the identity RUNNING the command, not the guild registration', async () => {
    // A resident persona process opens on herself.
    const asPersona = await renderData(ctx(), readModel({ resident: 'p-1', registered: [magma] }));
    expect(asPersona.currentProfileId).toBe('p-1');
    expect(asPersona.selectedProfileId).toBe('p-1');

    // The main bot opens on the main bot, even with a persona registered for the guild (051).
    const asMain = await renderData(ctx(), readModel({ resident: '', registered: [magma] }));
    expect(asMain.currentProfileId).toBe('main');
    expect(asMain.selectedProfileId).toBe('main');
  });

  test('an explicit selection wins when it names a real profile', async () => {
    const data = await renderData(ctx('p-1'), readModel({ registered: [magma] }));
    expect(data.selectedProfileId).toBe('p-1');
    const bogus = await renderData(ctx('nobody'), readModel({ registered: [magma] }));
    expect(bogus.selectedProfileId).toBe('main');
  });

  test('core and admin are never listed as anyone’s claim', async () => {
    const data = await renderData(ctx(), readModel());
    const names = data.tiers.flatMap((group) => group.modules.map((module) => module.name));
    expect(names).not.toContain('health');
    expect(names).not.toContain('permit');
  });

  test('the main bot claims a guild-enabled module no persona has bound, and loses it when one does', async () => {
    const free = await renderData(ctx(), readModel({ guildState: { 'hello-world': true } }));
    expect(free.tiers.flatMap((group) => group.modules.map((module) => module.name))).toContain(
      'hello-world',
    );

    const bound = await renderData(
      ctx(),
      readModel({
        guildState: { 'hello-world': true },
        bindings: [{ moduleSlug: 'hello-world', personaId: 'p-1' }],
        registered: [magma],
      }),
    );
    expect(
      bound.tiers.flatMap((group) => group.modules.map((module) => module.name)),
    ).not.toContain('hello-world');
  });

  test('a persona claims her binding and only her binding', async () => {
    const data = await renderData(
      ctx('p-1'),
      readModel({
        registered: [magma],
        // Enabled for the guild but bound to nobody: that is the BOT's claim, not hers.
        guildState: { shop: true },
        bindings: [{ moduleSlug: 'hello-world', personaId: 'p-1' }],
      }),
    );
    const names = data.tiers.flatMap((group) => group.modules.map((module) => module.name));
    expect(names).toEqual(['hello-world']);
    // The tier grouping carries the module's own icon.
    expect(data.tiers[0]?.modules[0]?.icon).toBe('[dumby_hello]');
  });

  test('an offline bot makes the page offline', async () => {
    const read = {
      ...readModel(),
      botIdentity: async () => ({ name: 'Dumby', applicationId: 'app-1', online: false }),
    };
    const data = await renderData(ctx(), read);
    expect(data.status).toBe('offline');
    expect(data.profiles[0]?.statusLabel).toBe('Offline');
  });
});
