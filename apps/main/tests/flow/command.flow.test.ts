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
