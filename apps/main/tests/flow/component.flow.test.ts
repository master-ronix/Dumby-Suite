import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startFlow, type FlowContext } from './harness.js';
import { FLOW_OWNER_ID } from './flow-env.js';

let ctx: FlowContext;
beforeAll(async () => {
  ctx = await startFlow();
}, 120_000);
afterAll(async () => {
  await ctx.teardown();
}, 120_000);

function componentInteraction(customId: string, userId: string): unknown {
  return {
    customId,
    user: { id: userId },
    guildId: null,
    reply: async () => undefined,
    deferReply: async () => undefined,
    editReply: async () => undefined,
  };
}

describe('flow: a component interaction travels the registry', () => {
  it('mints a customId, dispatches to the invoker, and runs the handler', async () => {
    const registry = ctx.handle.interactionRegistry;
    const executed: string[] = [];
    registry.register({
      customIdPrefix: 'flow:',
      parse: (customId) => customId,
      execute: async (interaction) => {
        executed.push(interaction.customId);
      },
    });
    const customId = registry.mintCustomId({
      moduleNamespace: 'flow',
      handlerKey: 'btn',
      invokerId: FLOW_OWNER_ID,
      contextPayload: 'p1',
    });
    const handled = await registry.dispatch(componentInteraction(customId, FLOW_OWNER_ID) as never);
    expect(handled).toBe(true);
    expect(executed).toHaveLength(1);
  });

  it('silently drops a non-invoker click without executing the handler', async () => {
    const registry = ctx.handle.interactionRegistry;
    const executed: string[] = [];
    registry.register({
      customIdPrefix: 'flow2:',
      parse: (customId) => customId,
      execute: async () => {
        executed.push('ran');
      },
    });
    const customId = registry.mintCustomId({
      moduleNamespace: 'flow2',
      handlerKey: 'btn',
      invokerId: FLOW_OWNER_ID,
      contextPayload: 'p1',
    });
    const handled = await registry.dispatch(
      componentInteraction(customId, '888888888888888888') as never,
    );
    expect(handled).toBe(true);
    expect(executed).toHaveLength(0);
  });
});
