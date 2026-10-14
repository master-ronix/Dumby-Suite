import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFlow, type FlowContext } from './harness.js';
import { FLOW_GUILD_ID, FLOW_OWNER_ID } from './flow-env.js';

let ctx: FlowContext;
beforeAll(async () => {
  ctx = await startFlow();
  ctx.handle.commandRegistry.registerModule('flow-mod', 'core');
  ctx.handle.commandRegistry.register({
    data: { name: 'flowcmd', description: 'flow happy path' },
    execute: async () => 'flow-ok',
    moduleId: 'flow-mod',
    permissionDeclared: true,
    permissions: { rbac: 'OWNER' },
  });
  // A non-core tier command: the RBAC rank check (layer 6) applies to these.
  ctx.handle.commandRegistry.registerModule('flow-std', 'standard');
  // UR-20261012-076 — the MODULE registry must know this module's TIER too. The guild-scope check
  // resolves the tier from the module registry, and an unknown module falls through to `marketplace`,
  // which defaults to DISABLED — so the scope check denied the command before the RBAC rank check
  // this test exists to exercise was ever reached.
  //
  // It passed before only because a scope denial happened to render `FORBIDDEN`, which is what the
  // assertion looked for. Making the notice honest (UR-074) turned a passing-for-the-wrong-reason
  // test into a failing one — and the failure is correct: the command really was being refused for
  // the wrong reason.
  ctx.handle.moduleRegistry.register({
    manifest: {
      name: 'flow-std',
      tier: 'standard',
      version: '1.0.0',
      description: 'flow standard-tier module',
      required: false,
      commands: [],
      provides: [],
      depends: [],
      events: [],
      services: [],
      repositories: [],
      jobs: [],
      tasks: [],
      routes: [],
      middleware: [],
      migrations: [],
      locales: [],
      config: {},
      intents: [],
      partials: [],
    },
  } as never);
  ctx.handle.commandRegistry.register({
    data: { name: 'stdcmd', description: 'rank-gated command' },
    execute: async () => 'std-ok',
    moduleId: 'flow-std',
    permissionDeclared: true,
    permissions: { rbac: 'OWNER' },
  });
}, 120_000);
afterAll(async () => {
  await ctx.teardown();
}, 120_000);

interface MockInteraction {
  commandName: string;
  user: { id: string };
  guildId: string | null;
  reply: (o: unknown) => Promise<void>;
  deferReply: (o?: unknown) => Promise<void>;
  editReply: (o: unknown) => Promise<void>;
  replied: boolean;
  deferred: boolean;
}

function interaction(
  commandName: string,
  userId: string,
): {
  mock: MockInteraction;
  replies: unknown[];
  edits: unknown[];
} {
  const replies: unknown[] = [];
  const edits: unknown[] = [];
  const mock: MockInteraction = {
    commandName,
    user: { id: userId },
    guildId: FLOW_GUILD_ID,
    reply: async (o) => {
      replies.push(o);
    },
    deferReply: async () => undefined,
    editReply: async (o) => {
      edits.push(o);
    },
    replied: false,
    deferred: false,
  };
  return { mock, replies, edits };
}

describe('flow: a command travels the full dispatch path', () => {
  it('buffers then renders the final surface for an owner command', async () => {
    const { mock, replies, edits } = interaction('flowcmd', FLOW_OWNER_ID);
    await ctx.handle.commandRouter.dispatch(mock as never);
    expect(replies.length).toBe(1); // the instant buffer
    expect(edits.length).toBeGreaterThanOrEqual(1); // exactly one final render
    expect(JSON.stringify(edits.at(-1))).toContain('flow-ok');
  });

  it('renders a formal notice (UNKNOWN_COMMAND) for an unregistered command', async () => {
    const { mock, edits } = interaction('does-not-exist', FLOW_OWNER_ID);
    await ctx.handle.commandRouter.dispatch(mock as never);
    expect(JSON.stringify(edits.at(-1))).toContain('UNKNOWN_COMMAND');
  });

  it('denies a non-owner and renders a FORBIDDEN notice', async () => {
    const { mock, edits } = interaction('stdcmd', '999999999999999999');
    await ctx.handle.commandRouter.dispatch(mock as never);
    expect(JSON.stringify(edits.at(-1))).toContain('FORBIDDEN');
  });
});
