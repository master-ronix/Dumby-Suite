import { describe, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ApplicationAlreadyRegisteredError,
  boundModulesForPersona,
  buildPersonaIdentity,
  assertApplicationNotRegistered,
  assertBindingAllowed,
  assertFreeCharterRegistration,
  assertSameGuild,
  FreeCharterEndedError,
  FREE_CHARTER_SUNSET_CONDITION,
  freeCharterStatus,
  PersonaOccupiedError,
  resolveBindingOwner,
  sealPersonaBotToken,
  SingleServerBoundViolationError,
  type FreeCharterCostSignals,
  type PersonaBinding,
  type PersonaIdentity,
  type PersonaRegistrationInput,
} from '../../src/personas/persona.js';
import { PersonaCommandBindingService } from '../../src/personas/persona-command-binding.service.js';
import { InMemoryPersonaStores } from '../../src/personas/persona.repository.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { CommandRouter, type CommandRouterOptions } from '../../src/commands/command-router.js';
import { createLogger } from '../../src/logging/logger.js';
import { randomRootKey } from '../../src/crypto/envelope.js';

const logger = createLogger('error');
const PERSONA_ROOT_KEY = randomRootKey('persona-root');

const quietSignals: FreeCharterCostSignals = {
  dedicatedInfrastructureRequired: false,
  perPersonaCostMeasurable: false,
};

function registration(overrides: Partial<PersonaRegistrationInput> = {}): PersonaRegistrationInput {
  return {
    name: 'Community Bot',
    discordApplicationId: 'app-100',
    boundGuildId: 'guild-1',
    botTokenDigest: 'argon2id$digest-of-the-supplied-token',
    botTokenSealed: sealPersonaBotToken('the-supplied-token-has-no-plaintext', PERSONA_ROOT_KEY),
    registrarAuthority: 'oob-proof-of-app-ownership',
    ...overrides,
  };
}

function persona(input: Partial<PersonaRegistrationInput> = {}): PersonaIdentity {
  return buildPersonaIdentity(registration(input));
}

describe('M7 persona model — bring-your-own-identity, single-server-bound', () => {
  test('buildPersonaIdentity returns a free-chart, single-server persona from registration', () => {
    const p = persona();
    expect(p.name).toBe('Community Bot');
    expect(p.discordApplicationId).toBe('app-100');
    expect(p.boundGuildId).toBe('guild-1');
    expect(p.charter).toBe('free');
    expect(p.status).toBe('active');
    expect(p.dmBehavior).toBe('prohibited');
    expect(p.shardAllocation).toBe(1);
    expect(p.grandfathered).toBe(false);
  });

  test('the supplied token is never stored as plaintext (digest + sealed envelope)', () => {
    expect(persona().botTokenDigest).toContain('argon2id');
    const built = buildPersonaIdentity(registration());
    expect(built.botTokenDigest).not.toContain('the-supplied-token-has-no-plaintext');
  });

  test('registration refuses an application already registered to a persona', () => {
    const existing = persona();
    expect(() => assertApplicationNotRegistered(existing)).toThrow(
      ApplicationAlreadyRegisteredError,
    );
    expect(new ApplicationAlreadyRegisteredError('app-100').message).toMatch(
      /one persona = one application/,
    );
  });

  test('registration requires the registrar to prove authority over the application (BYOI)', () => {
    expect(() => buildPersonaIdentity(registration({ registrarAuthority: '' }))).toThrow(
      /registrar must prove authority/,
    );
  });

  test('single-server invariant: a persona can never act in a guild it was not commissioned by', () => {
    const p = persona();
    assertSameGuild(p, 'guild-1');
    expect(() => assertSameGuild(p, 'guild-2')).toThrow(SingleServerBoundViolationError);
    expect(() => assertSameGuild({ ...p, status: 'retired' }, 'guild-1')).toThrow(/not active/);
  });
});

describe('M7 free-charter sunset (ADR-008)', () => {
  test('FREE_CHARTER_SUNSET_CONDITION records the ADR-008 end condition', () => {
    expect(FREE_CHARTER_SUNSET_CONDITION).toMatch(/free default ends/);
    expect(FREE_CHARTER_SUNSET_CONDITION).toMatch(/dedicated infrastructure/);
    expect(FREE_CHARTER_SUNSET_CONDITION).toMatch(/cost line/);
  });

  test('the free default runs while cost stays incidental', () => {
    expect(freeCharterStatus(quietSignals).sunsetEffective).toBe(false);
    expect(() => assertFreeCharterRegistration(false, quietSignals)).not.toThrow();
  });

  test('dedicated infrastructure required = sunset effective; new free registrations refused', () => {
    expect(
      freeCharterStatus({ dedicatedInfrastructureRequired: true, perPersonaCostMeasurable: false })
        .sunsetEffective,
    ).toBe(true);
    expect(() =>
      assertFreeCharterRegistration(false, {
        dedicatedInfrastructureRequired: true,
        perPersonaCostMeasurable: false,
      }),
    ).toThrow(FreeCharterEndedError);
  });

  test('a measurable per-persona cost line = sunset effective', () => {
    expect(
      freeCharterStatus({ dedicatedInfrastructureRequired: false, perPersonaCostMeasurable: true })
        .sunsetEffective,
    ).toBe(true);
    expect(() =>
      assertFreeCharterRegistration(false, {
        dedicatedInfrastructureRequired: false,
        perPersonaCostMeasurable: true,
      }),
    ).toThrow(FreeCharterEndedError);
  });

  test('existing single-server-bound personas are grandfathered (honored) at the sunset', () => {
    expect(() =>
      assertFreeCharterRegistration(true, {
        dedicatedInfrastructureRequired: true,
        perPersonaCostMeasurable: false,
      }),
    ).not.toThrow();
  });
});

describe('M7 bindings — "occupied by another persona" gate', () => {
  const p1 = persona({ name: 'Persona A', discordApplicationId: 'app-1' });
  const p2 = persona({ name: 'Persona B', discordApplicationId: 'app-2' });

  test('a bind for a different persona on a bound pair is refused', () => {
    const existing: PersonaBinding = { guildId: 'guild-1', moduleSlug: 'audio', personaId: p1.id };
    expect(() =>
      assertBindingAllowed({
        guildId: 'guild-1',
        moduleSlug: 'audio',
        personaId: p2.id,
        persona: p2,
        existingBinding: existing,
      }),
    ).toThrow(PersonaOccupiedError);
  });

  test('rebinding the same persona on the same pair is a no-op (allowed)', () => {
    const existing: PersonaBinding = { guildId: 'guild-1', moduleSlug: 'audio', personaId: p1.id };
    expect(() =>
      assertBindingAllowed({
        guildId: 'guild-1',
        moduleSlug: 'audio',
        personaId: p1.id,
        persona: p1,
        existingBinding: existing,
      }),
    ).not.toThrow();
  });

  test('a persona cannot be bound into a guild that did not commission it', () => {
    expect(() =>
      assertBindingAllowed({
        guildId: 'guild-9',
        moduleSlug: 'audio',
        personaId: p1.id,
        persona: p1,
      }),
    ).toThrow(SingleServerBoundViolationError);
  });

  test('resolveBindingOwner and boundModulesForPersona compute the command inventory', () => {
    const bindings: readonly PersonaBinding[] = [
      { guildId: 'guild-1', moduleSlug: 'audio', personaId: p1.id },
      { guildId: 'guild-1', moduleSlug: 'economy', personaId: p2.id },
    ];
    expect(resolveBindingOwner(bindings, 'guild-1', 'audio')).toBe(p1.id);
    expect(resolveBindingOwner(bindings, 'guild-1', 'nope')).toBeUndefined();
    expect(boundModulesForPersona(bindings, p1.id)).toEqual(['audio']);
    expect(boundModulesForPersona(bindings, p2.id)).toEqual(['economy']);
  });
});

describe('M7 PersonaCommandBindingService', () => {
  function makeService(withStores = new InMemoryPersonaStores()) {
    return {
      stores: withStores,
      service: new PersonaCommandBindingService(withStores, withStores, logger),
    };
  }

  test('registerPersona records a persona bound to its commissioning guild', async () => {
    const { stores, service } = makeService();
    const p = await service.registerPersona(registration(), quietSignals);
    expect(p.id).toBeTruthy();
    expect((await stores.list()).length).toBe(1);
    expect((await stores.findByBoundGuildId('guild-1'))?.id).toBe(p.id);
  });

  test('registering the same application again is refused', async () => {
    const { service } = makeService();
    await service.registerPersona(registration(), quietSignals);
    await expect(service.registerPersona(registration(), quietSignals)).rejects.toThrow(
      ApplicationAlreadyRegisteredError,
    );
  });

  test('the sunset refuses new free-charter registrations but honors grandfathered ones', async () => {
    const { service } = makeService();
    await expect(
      service.registerPersona(registration(), {
        dedicatedInfrastructureRequired: true,
        perPersonaCostMeasurable: false,
      }),
    ).rejects.toThrow(FreeCharterEndedError);
    const grandfathered = await service.registerPersona(registration({ grandfathered: true }), {
      dedicatedInfrastructureRequired: true,
      perPersonaCostMeasurable: false,
    });
    expect(grandfathered.grandfathered).toBe(true);
  });

  test('bindModuleToPersona binds one module in one guild to a persona', async () => {
    const { service } = makeService();
    const p = await service.registerPersona(registration(), quietSignals);
    const binding = await service.bindModuleToPersona({
      guildId: 'guild-1',
      moduleSlug: 'audio',
      personaId: p.id,
    });
    expect(binding.personaId).toBe(p.id);
    expect(await service.resolveCommandOwner('guild-1', 'audio')).toBe(p.id);
  });

  test('a bind colliding with another persona is refused with "occupied"', async () => {
    const { service } = makeService();
    const a = await service.registerPersona(
      registration({ name: 'A', discordApplicationId: 'app-1' }),
      quietSignals,
    );
    const b = await service.registerPersona(
      registration({ name: 'B', discordApplicationId: 'app-2' }),
      quietSignals,
    );
    await service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: a.id });
    await expect(
      service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: b.id }),
    ).rejects.toThrow(PersonaOccupiedError);
  });

  test('a persona cannot bind a module into a guild that did not commission it', async () => {
    const { service } = makeService();
    const p = await service.registerPersona(registration(), quietSignals);
    await expect(
      service.bindModuleToPersona({ guildId: 'guild-7', moduleSlug: 'audio', personaId: p.id }),
    ).rejects.toThrow(SingleServerBoundViolationError);
  });

  test('unbind releases the lock for a new bind to claim', async () => {
    const { service } = makeService();
    const a = await service.registerPersona(
      registration({ name: 'A', discordApplicationId: 'app-1' }),
      quietSignals,
    );
    const b = await service.registerPersona(
      registration({ name: 'B', discordApplicationId: 'app-2' }),
      quietSignals,
    );
    await service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: a.id });
    await service.unbindModule('guild-1', 'audio');
    expect(await service.resolveCommandOwner('guild-1', 'audio')).toBeUndefined();
    await service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: b.id });
    expect(await service.resolveCommandOwner('guild-1', 'audio')).toBe(b.id);
  });

  test('commandsForGuild resolves the full persona inventory for a guild', async () => {
    const { service } = makeService();
    const a = await service.registerPersona(
      registration({ name: 'A', discordApplicationId: 'app-1' }),
      quietSignals,
    );
    const b = await service.registerPersona(
      registration({ name: 'B', discordApplicationId: 'app-2' }),
      quietSignals,
    );
    await service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: a.id });
    await service.bindModuleToPersona({
      guildId: 'guild-1',
      moduleSlug: 'economy',
      personaId: b.id,
    });
    const inventory = await service.commandsForGuild('guild-1');
    expect(inventory.map((x) => x.moduleSlug).sort()).toEqual(['audio', 'economy']);
  });

  test('binding against a persona that does not exist is refused', async () => {
    const { service } = makeService();
    await expect(
      service.bindModuleToPersona({ guildId: 'guild-1', moduleSlug: 'audio', personaId: 'ghost' }),
    ).rejects.toThrow(/No persona "ghost" exists/);
  });
});

describe('M7 dispatch gate — address-command already-owned rejection', () => {
  function makeInteraction(name: string) {
    const replies: unknown[] = [];
    const edits: unknown[] = [];
    return {
      commandName: name,
      user: { id: 'user-1' },
      guildId: 'guild-1',
      reply: (options: unknown) => {
        replies.push(options);
        return Promise.resolve();
      },
      deferReply: () => Promise.resolve(),
      editReply: (options: unknown) => {
        edits.push(options);
        return Promise.resolve();
      },
      get replied() {
        return replies.length > 0;
      },
      edits,
    };
  }

  function buildRouter(overrides: CommandRouterOptions) {
    const reg = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue(undefined);
    reg.registerModule('audio', 'core');
    reg.register({
      data: { name: 'audio', description: 'A' },
      execute: handler,
      moduleId: 'audio',
    });
    return { reg, handler, router: new CommandRouter(reg, logger, overrides) };
  }

  test('a command owned by a different persona is refused at dispatch, handler never runs', async () => {
    const { handler, router } = buildRouter({
      resolveCommandOwner: async () => 'persona-1',
    });
    const interaction = makeInteraction('audio');
    await router.dispatch(interaction);

    expect(handler).not.toHaveBeenCalled();
    expect(interaction.edits.length).toBeGreaterThan(0);
    const last = interaction.edits[interaction.edits.length - 1] as { components?: unknown[] };
    const text = JSON.stringify(last.components ?? []);
    expect(text).toContain('reason: FORBIDDEN');
  });

  test('the persona that owns the command key dispatches it normally', async () => {
    const { handler, router } = buildRouter({
      resolveCommandOwner: async () => 'persona-1',
      residentPersonaId: 'persona-1',
    });
    const interaction = makeInteraction('audio');
    await router.dispatch(interaction);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('an unowned command dispatches under the default main-bot identity', async () => {
    const { handler, router } = buildRouter({
      resolveCommandOwner: async () => undefined,
    });
    await router.dispatch(makeInteraction('audio'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('PersonaOccupiedError carries the occupied command key and maps to FORBIDDEN', () => {
    const error = new PersonaOccupiedError('guild-1', 'audio', 'persona-1');
    expect(error.name).toBe('PersonaOccupiedError');
    expect(error.message).toMatch(/occupied by another persona/);
  });
});

describe('M7 structural gates', () => {
  const routerSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'commands', 'command-router.ts'),
    'utf8',
  );
  const twillSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'entry', 'twill.ts'),
    'utf8',
  );
  const schemaSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'config', 'env.schema.ts'),
    'utf8',
  );
  const bootstrapSource = readFileSync(
    join(import.meta.dirname, '..', '..', 'src', 'bootstrap', 'bootstrap.ts'),
    'utf8',
  );

  test('command router enforces the persona dispatch gate', () => {
    expect(routerSource).toContain('resolveCommandOwner');
    expect(routerSource).toContain('residentPersonaId');
    expect(routerSource).toContain('PersonaOccupiedError');
    expect(routerSource).toContain('assertPersonaOwnsCommand');
  });

  test('the Twill registration API stub is the honest creation surface (501, no provisioning)', () => {
    expect(twillSource).toContain("'/twill/personas/register'");
    expect(twillSource).toContain('501');
    expect(twillSource).not.toContain('PersonaCommandBindingService');
    expect(twillSource).not.toContain('persona_identities');
    expect(twillSource).toContain('ADR-011');
    expect(twillSource).toContain('ADR-008');
  });

  test('the persona binding service is wired at bootstrap, never zero-caller (§18.5.1)', () => {
    expect(bootstrapSource).toContain('new PersonaCommandBindingService');
    expect(bootstrapSource).toContain('PostgresPersonaIdentityStore');
    expect(bootstrapSource).toContain('PostgresPersonaBindingStore');
    expect(bootstrapSource).toContain('resolveCommandOwner');
    expect(bootstrapSource).toContain("config.get('PERSONA_ID')");
  });

  test('the persona process identity is a declared env key', () => {
    expect(schemaSource).toContain("PERSONA_ID: z.string().default('')");
    expect(schemaSource).toContain('TWILL_PORT');
  });
});
