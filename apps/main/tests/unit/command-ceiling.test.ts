import { test, expect } from 'vitest';
import {
  CommandCeilingService,
  CommandCeilingExceededError,
  MAX_COMMANDS_PER_GUILD,
  isCommandCeilingError,
} from '../../src/commands/command-ceiling.js';

test('exports MAX_COMMANDS_PER_GUILD as 100', () => {
  expect(MAX_COMMANDS_PER_GUILD).toBe(100);
});

test('project allows when under ceiling', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: async () => 50,
    getPendingAdditions: async () => 10,
    getPendingRemovals: async () => 5,
  });
  const proj = await service.project('guild-1');
  expect(proj.current).toBe(50);
  expect(proj.pendingAdditions).toBe(10);
  expect(proj.pendingRemovals).toBe(5);
  expect(proj.projected).toBe(55);
  expect(proj.allowed).toBe(true);
});

test('project denies when projected exceeds ceiling', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: async () => 95,
    getPendingAdditions: async () => 10,
    getPendingRemovals: async () => 0,
  });
  const proj = await service.project('guild-1');
  expect(proj.projected).toBe(105);
  expect(proj.allowed).toBe(false);
});

test('guard throws CommandCeilingExceededError when projected exceeds ceiling', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: async () => 100,
    getPendingAdditions: async () => 1,
    getPendingRemovals: async () => 0,
  });
  await expect(service.guard('guild-1')).rejects.toThrow(CommandCeilingExceededError);
});

test('guard returns projection when allowed', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: async () => 50,
    getPendingAdditions: async () => 0,
    getPendingRemovals: async () => 0,
  });
  const proj = await service.guard('guild-1');
  expect(proj.allowed).toBe(true);
  expect(proj.projected).toBe(50);
});

test('CommandCeilingExceededError exposes projected and ceiling', () => {
  const err = new CommandCeilingExceededError(105, 100);
  expect(err.projected).toBe(105);
  expect(err.ceiling).toBe(100);
  expect(err.message).toContain('105');
  expect(err.message).toContain('100');
});

test('isCommandCeilingError type guard', () => {
  expect(isCommandCeilingError(new CommandCeilingExceededError(101, 100))).toBe(true);
  expect(isCommandCeilingError(new Error('other'))).toBe(false);
});

test('uses sync deps when async not needed', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: () => 30,
    getPendingAdditions: () => 20,
    getPendingRemovals: () => 0,
  });
  const proj = await service.project('guild-2');
  expect(proj.projected).toBe(50);
  expect(proj.allowed).toBe(true);
});

test('project with exact ceiling is allowed', async () => {
  const service = new CommandCeilingService({
    getCurrentCommandCount: async () => 90,
    getPendingAdditions: async () => 10,
    getPendingRemovals: async () => 0,
  });
  const proj = await service.project('guild-1');
  expect(proj.projected).toBe(100);
  expect(proj.allowed).toBe(true);
});
