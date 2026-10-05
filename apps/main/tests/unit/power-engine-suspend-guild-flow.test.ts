import { describe, expect, test, vi } from 'vitest';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter } from '../../src/commands/command-router.js';
import { InMemoryGuildSuspensionStore } from '../../src/governance/guild-suspension.js';
import {
  InMemoryAuditWriter,
  PowerEngineDispatcher,
  type PowerEngineAuditEntry,
} from '../../src/http/power-engine-dispatcher.js';
import { createPowerEngineCatalog } from '../../src/http/power-engine-catalog.js';
import { createLogger } from '../../src/logging/logger.js';

/**
 * The flow test the suite never had. It exercises one Power Engine control action across every
 * layer it touches — the catalog, the dispatcher, the audit trail, the guild-suspension store, the
 * command router and the renderer — because each of those was built and tested in isolation and
 * nothing proved they connect.
 *
 * Source: blueprint.md §22.2 / Table 22-A — `suspendGuild` "immediately blocks the bot from
 * responding to ANY interaction originating in the named guild, fleet-wide, regardless of that
 * guild's own configuration"; §22.6 — every invocation writes an unconditional audit entry with the
 * true outcome; §22.7 — a correlation id joins the caller's row to the handler's.
 */
const logger = createLogger('error');

function makeInteraction(name = 'health', guildId = 'g1') {
  return {
    commandName: name,
    user: { id: 'u1' },
    guildId,
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

function textContents(payload: unknown): string[] {
  const msg = payload as { components?: Array<{ components?: unknown[] }> } | undefined;
  if (msg === undefined || !Array.isArray(msg.components)) return [];
  const out: string[] = [];
  const walk = (components: unknown[]): void => {
    for (const component of components) {
      const comp = component as { type?: number; content?: string; components?: unknown[] };
      if (comp.type === 10 && typeof comp.content === 'string') out.push(comp.content);
      if (Array.isArray(comp.components)) walk(comp.components);
    }
  };
  for (const component of msg.components) {
    const comp = component as { components?: unknown[] };
    if (Array.isArray(comp.components)) walk(comp.components);
    else walk([component]);
  }
  return out;
}

function lastEditText(interaction: { editReply: ReturnType<typeof vi.fn> }): string {
  const calls = interaction.editReply.mock.calls;
  const last = calls.length > 0 ? calls[calls.length - 1]?.[0] : undefined;
  return textContents(last).join('\n');
}

function buildHarness() {
  const suspensions = new InMemoryGuildSuspensionStore();
  const audit = new InMemoryAuditWriter();
  const dispatcher = new PowerEngineDispatcher(
    { trustedSources: ['clai', 'power-engine-internal'] },
    audit,
  );
  const catalog = createPowerEngineCatalog({ guildSuspensions: suspensions, logger });
  const registry = new CommandRegistry();
  const handler = vi.fn().mockResolvedValue({ ok: true });
  registry.registerModule('core', 'core');
  registry.register({
    data: { name: 'health', description: 'H' },
    execute: handler,
    moduleId: 'core',
  });
  const router = new CommandRouter(registry, logger, { guildSuspensions: suspensions });
  return { suspensions, audit, dispatcher, catalog, registry, handler, router };
}

const operator = {
  actorId: 'op-1',
  source: 'clai',
  reason: 'abuse report',
  correlationId: 'corr-1',
};

describe('Power Engine suspendGuild — the end-to-end control flow (§22.2)', () => {
  test('suspendGuild writes the state and audits the true outcome, joined by correlationId', async () => {
    const { suspensions, audit, dispatcher, catalog } = buildHarness();

    const outcome = await dispatcher.dispatchFunction(
      'suspendGuild',
      { guildId: 'g1', reason: 'abuse report', confirm: true },
      operator,
      catalog,
    );

    expect(outcome.ok).toBe(true);
    expect(await suspensions.isSuspended('g1')).toBe(true);
    const row = audit.entries.at(-1) as PowerEngineAuditEntry;
    expect(row.action).toBe('suspendGuild');
    expect(row.outcome).toBe('allowed');
    expect(row.correlationId).toBe('corr-1');
  });

  test('a suspended guild blocks dispatch and renders GUILD_UNAVAILABLE', async () => {
    const { dispatcher, catalog, handler, router } = buildHarness();
    await dispatcher.dispatchFunction(
      'suspendGuild',
      { guildId: 'g1', reason: 'abuse report', confirm: true },
      operator,
      catalog,
    );

    const interaction = makeInteraction('health');
    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(lastEditText(interaction)).toContain('reason: GUILD_UNAVAILABLE');
  });

  test('the block is fleet-wide and overrides the guild — a different guild still dispatches', async () => {
    const { dispatcher, catalog, handler, router } = buildHarness();
    await dispatcher.dispatchFunction(
      'suspendGuild',
      { guildId: 'g1', reason: 'abuse report', confirm: true },
      operator,
      catalog,
    );

    const other = makeInteraction('health', 'g2');
    await router.dispatch(other);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(other)).not.toContain('GUILD_UNAVAILABLE');
  });

  test('unsuspendGuild restores dispatch', async () => {
    const { dispatcher, catalog, handler, router } = buildHarness();
    await dispatcher.dispatchFunction(
      'suspendGuild',
      { guildId: 'g1', reason: 'r', confirm: true },
      operator,
      catalog,
    );
    const blocked = makeInteraction('health');
    await router.dispatch(blocked);
    expect(handler).not.toHaveBeenCalled();

    await dispatcher.dispatchFunction(
      'unsuspendGuild',
      { guildId: 'g1', reason: 'resolved' },
      operator,
      catalog,
    );
    const restored = makeInteraction('health');
    await router.dispatch(restored);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(lastEditText(restored)).not.toContain('GUILD_UNAVAILABLE');
  });

  test('suspendGuild refuses without the §22.6 confirmation flag', async () => {
    const { suspensions, audit, dispatcher, catalog } = buildHarness();

    await expect(
      dispatcher.dispatchFunction(
        'suspendGuild',
        { guildId: 'g1', reason: 'r' },
        operator,
        catalog,
      ),
    ).rejects.toThrow(/confirm/);

    expect(await suspensions.isSuspended('g1')).toBe(false);
    // §22.6 — the refusal is still audited, as `failed`, not silently dropped.
    expect((audit.entries.at(-1) as PowerEngineAuditEntry).outcome).toBe('failed');
  });

  test('a declared-but-unimplemented function audits honestly as failed, never as allowed', async () => {
    const { audit, dispatcher, catalog } = buildHarness();

    await expect(
      dispatcher.dispatchFunction('suspendModule', { moduleId: 'browse' }, operator, catalog),
    ).rejects.toThrow(/no backing primitive/);

    const row = audit.entries.at(-1) as PowerEngineAuditEntry;
    expect(row.outcome).toBe('failed');
    expect(row.failureReason).toContain('no backing primitive');
  });

  test('an unknown function is rejected and audited, not dispatched', async () => {
    const { audit, dispatcher, catalog } = buildHarness();

    const outcome = await dispatcher.dispatchFunction('notARealFunction', {}, operator, catalog);

    expect(outcome.ok).toBe(false);
    const row = audit.entries.at(-1) as PowerEngineAuditEntry;
    expect(row.outcome).toBe('rejected');
    expect(row.rejectionReason).toBe('UNKNOWN_FUNCTION');
  });

  test('an untrusted source is rejected before the handler runs', async () => {
    const { suspensions, audit, dispatcher, catalog } = buildHarness();

    const outcome = await dispatcher.dispatchFunction(
      'suspendGuild',
      { guildId: 'g1', reason: 'r', confirm: true },
      { actorId: 'op-1', source: 'someone-else', reason: 'r' },
      catalog,
    );

    expect(outcome.ok).toBe(false);
    expect(await suspensions.isSuspended('g1')).toBe(false);
    expect((audit.entries.at(-1) as PowerEngineAuditEntry).rejectionReason).toBe(
      'UNTRUSTED_SOURCE',
    );
  });
});
