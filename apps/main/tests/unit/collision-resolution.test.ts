import { test, expect, vi } from 'vitest';
import {
  CollisionResolutionService,
  CollisionResolutionError,
} from '../../src/commands/collision-resolution.js';

function makeDeps(overrides: Record<string, unknown> = {}) {
  let moduleStates = new Map<string, string>();
  let overridesMap = new Map<string, unknown>();

  return {
    getActiveCommands: vi.fn<
      [string],
      Promise<readonly { commandKey: string; moduleId: string }[]>
    >(),
    getModuleCommands: vi.fn<[string], Promise<readonly string[]>>(),
    getModuleState: vi.fn<[string, string], Promise<string | undefined>>(
      async (_guildId, moduleSlug) => moduleStates.get(moduleSlug),
    ),
    setModuleState: vi.fn<[string, string, string], Promise<void>>(
      async (_guildId, moduleSlug, state) => {
        moduleStates.set(moduleSlug, state);
      },
    ),
    writeOverride: vi.fn<[unknown], Promise<void>>(async (o) => {
      const ov = o as { guildId: string; commandKey: string };
      overridesMap.set(`${ov.guildId}:${ov.commandKey}`, o);
    }),
    getOverride: vi.fn<[string, string], Promise<unknown | undefined>>(
      async (guildId, commandKey) => overridesMap.get(`${guildId}:${commandKey}`),
    ),
    deleteOverride: vi.fn<[string, string], Promise<void>>(async (guildId, commandKey) => {
      overridesMap.delete(`${guildId}:${commandKey}`);
    }),
    listPendingResolutions: vi.fn<[string], Promise<readonly unknown[]>>(async () => []),
    ...overrides,
  };
}

test('detectCollisions returns empty when module has no commands', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue([]);
  const service = new CollisionResolutionService(deps as never);
  const result = await service.detectCollisions('guild-1', 'mod-a');
  expect(result).toHaveLength(0);
});

test('detectCollisions returns empty when no active commands in guild', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue(['cmd1', 'cmd2']);
  deps.getActiveCommands.mockResolvedValue([]);
  const service = new CollisionResolutionService(deps as never);
  const result = await service.detectCollisions('guild-1', 'mod-a');
  expect(result).toHaveLength(0);
});

test('detectCollisions finds collisions between incoming and existing commands', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue(['ban', 'kick', 'warn']);
  deps.getActiveCommands.mockResolvedValue([
    { commandKey: 'ban', moduleId: 'mod-b' },
    { commandKey: 'slowmode', moduleId: 'mod-c' },
  ]);
  const service = new CollisionResolutionService(deps as never);
  const result = await service.detectCollisions('guild-1', 'mod-a');
  expect(result).toHaveLength(1);
  expect(result[0]?.commandKey).toBe('ban');
  expect(result[0]?.incomingModule).toBe('mod-a');
  expect(result[0]?.existingModule).toBe('mod-b');
});

test('detectCollisions ignores same-module commands (no self-collision)', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue(['ban']);
  deps.getActiveCommands.mockResolvedValue([{ commandKey: 'ban', moduleId: 'mod-a' }]);
  const service = new CollisionResolutionService(deps as never);
  const result = await service.detectCollisions('guild-1', 'mod-a');
  expect(result).toHaveLength(0);
});

test('pauseOnCollision sets install_pending_resolution state when collisions exist', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue(['ban']);
  deps.getActiveCommands.mockResolvedValue([{ commandKey: 'ban', moduleId: 'mod-b' }]);
  const service = new CollisionResolutionService(deps as never);
  const collisions = await service.pauseOnCollision('guild-1', 'mod-a');
  expect(collisions).toHaveLength(1);
  expect(deps.setModuleState).toHaveBeenCalledWith(
    'guild-1',
    'mod-a',
    'install_pending_resolution',
  );
});

test('pauseOnCollision does not change state when no collisions', async () => {
  const deps = makeDeps();
  deps.getModuleCommands.mockResolvedValue(['ban']);
  deps.getActiveCommands.mockResolvedValue([]);
  const service = new CollisionResolutionService(deps as never);
  const collisions = await service.pauseOnCollision('guild-1', 'mod-a');
  expect(collisions).toHaveLength(0);
  expect(deps.setModuleState).not.toHaveBeenCalled();
});

test('resolveCollision writes override and returns it', async () => {
  const deps = makeDeps();
  const service = new CollisionResolutionService(deps as never);
  const result = await service.resolveCollision('guild-1', 'mod-a', 'ban', 'mod-b');
  expect(result.guildId).toBe('guild-1');
  expect(result.commandKey).toBe('ban');
  expect(result.winningModule).toBe('mod-b');
  expect(result.losingModule).toBe('mod-a');
  expect(deps.writeOverride).toHaveBeenCalled();
});

test('resolveCollision throws when override already exists', async () => {
  const deps = makeDeps();
  deps.getOverride.mockResolvedValue({ guildId: 'guild-1', commandKey: 'ban' } as never);
  const service = new CollisionResolutionService(deps as never);
  await expect(service.resolveCollision('guild-1', 'mod-a', 'ban', 'mod-b')).rejects.toThrow(
    CollisionResolutionError,
  );
});

test('finalizeResolution transitions to active when no pending collisions remain', async () => {
  const deps = makeDeps();
  deps.getModuleState.mockResolvedValue('install_pending_resolution');
  deps.getModuleCommands.mockResolvedValue(['ban']);
  deps.getActiveCommands.mockResolvedValue([]); // after resolution, no collisions
  deps.getOverride.mockResolvedValue({
    guildId: 'guild-1',
    commandKey: 'ban',
    winningModule: 'mod-b',
  } as never);
  const service = new CollisionResolutionService(deps as never);
  const result = await service.finalizeResolution('guild-1', 'mod-a');
  expect(result).toBe(true);
  expect(deps.setModuleState).toHaveBeenCalledWith('guild-1', 'mod-a', 'active');
});

test('finalizeResolution returns false when state is not install_pending_resolution', async () => {
  const deps = makeDeps();
  deps.getModuleState.mockResolvedValue('active');
  const service = new CollisionResolutionService(deps as never);
  const result = await service.finalizeResolution('guild-1', 'mod-a');
  expect(result).toBe(false);
  expect(deps.setModuleState).not.toHaveBeenCalled();
});

test('handleModuleDisable releases overrides for the disabled module', async () => {
  const deps = makeDeps();
  const service = new CollisionResolutionService(deps as never);
  await service.handleModuleDisable('guild-1', 'mod-disabled');
  expect(deps.getOverride).not.toHaveBeenCalled();
  expect(deps.deleteOverride).not.toHaveBeenCalled();
});
