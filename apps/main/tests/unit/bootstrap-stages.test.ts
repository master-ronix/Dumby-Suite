import { test, expect } from 'vitest';
import {
  BOOTSTRAP_STAGES,
  SHUTDOWN_STEPS,
  stageNumber,
  shutdownStepNumber,
  BootstrapProgress,
} from '../../src/bootstrap/stages.js';

test('there are exactly 18 bootstrap stages in the mandated order', () => {
  expect(BOOTSTRAP_STAGES.length).toBe(18);
  expect(BOOTSTRAP_STAGES).toStrictEqual([
        'PROCESS_SETUP',
        'CONFIG_LOAD',
        'HEALTH_SERVER_INIT',
        'OBSERVABILITY_INIT',
        'DATABASE_CONNECT',
        'MIGRATION_RUN',
        'CACHE_CONNECT',
        'QUEUE_INIT',
        'DI_BOOTSTRAP',
        'MODULE_DISCOVER',
        'MODULE_VALIDATE',
        'MODULE_LOAD',
        'COMMAND_REGISTER',
        'EVENT_REGISTER',
        'DISCORD_LOGIN',
        'CLIENT_READY',
        'MODULE_READY',
        'STARTUP_COMPLETE',
      ]);
});

test('there are exactly 9 shutdown steps in the mandated order', () => {
  expect(SHUTDOWN_STEPS.length).toBe(9);
  expect(SHUTDOWN_STEPS[0]).toBe('STOP_ACCEPTING_GATEWAY_EVENTS');
  expect(SHUTDOWN_STEPS[8]).toBe('CLOSE_DATABASE_POOL');
});

test('stageNumber and shutdownStepNumber are 1-indexed', () => {
  expect(stageNumber('PROCESS_SETUP')).toBe(1);
  expect(stageNumber('OBSERVABILITY_INIT')).toBe(4);
  expect(stageNumber('DISCORD_LOGIN')).toBe(15);
  expect(stageNumber('STARTUP_COMPLETE')).toBe(18);
  expect(shutdownStepNumber('STOP_ACCEPTING_GATEWAY_EVENTS')).toBe(1);
  expect(shutdownStepNumber('CLOSE_DATABASE_POOL')).toBe(9);
});

test('liveness flips true exactly at Stage 04 OBSERVABILITY_INIT, not before', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('HEALTH_SERVER_INIT'); // stage 3
  expect(progress.isLive()).toBe(false);
  progress.advanceTo('OBSERVABILITY_INIT'); // stage 4
  expect(progress.isLive()).toBe(true);
});

test('startup flips true exactly at Stage 15 DISCORD_LOGIN, not before', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('EVENT_REGISTER'); // stage 14
  expect(progress.isStarted()).toBe(false);
  progress.advanceTo('DISCORD_LOGIN'); // stage 15
  expect(progress.isStarted()).toBe(true);
});

test('readiness requires BOTH Stage 18 STARTUP_COMPLETE and required-module health', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('STARTUP_COMPLETE');
  expect(progress.isReady()).toBe(false);
  progress.setRequiredModulesHealthy(true);
  expect(progress.isReady()).toBe(true);
});

test('reaching STARTUP_COMPLETE alone is not sufficient for readiness if modules regress to unhealthy', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('STARTUP_COMPLETE');
  progress.setRequiredModulesHealthy(true);
  expect(progress.isReady()).toBe(true);
  progress.setRequiredModulesHealthy(false);
  expect(progress.isReady()).toBe(false);
});

test('advanceTo rejects moving the stage pointer backward', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('MODULE_LOAD');
  expect(() => progress.advanceTo('CONFIG_LOAD')).toThrow(RangeError);
});

test('currentStage reports null before any stage has been reached', () => {
  const progress = new BootstrapProgress();
  expect(progress.currentStage()).toBe(null);
  progress.advanceTo('PROCESS_SETUP');
  expect(progress.currentStage()).toBe('PROCESS_SETUP');
});

test('hasReached is monotonic: reaching a later stage implies every earlier stage was reached', () => {
  const progress = new BootstrapProgress();
  progress.advanceTo('MODULE_READY'); // stage 17
  expect(progress.hasReached('PROCESS_SETUP')).toBe(true);
  expect(progress.hasReached('DI_BOOTSTRAP')).toBe(true);
  expect(progress.hasReached('STARTUP_COMPLETE')).toBe(false);
});
