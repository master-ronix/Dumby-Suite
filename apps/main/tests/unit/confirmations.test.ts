import { describe, expect, test } from 'vitest';
import {
  disableConfirmationDescriptor,
  disableConfirmationSummary,
  enableConfirmationDescriptor,
  enableConfirmationSummary,
} from '../../src/rendering/confirmations.js';

describe('disableConfirmationSummary', () => {
  test('names the module and its commands', () => {
    const summary = disableConfirmationSummary('Hello World', ['hello']);
    expect(summary).toContain('Hello World');
    expect(summary).toContain('`/hello`');
    expect(summary).toContain('disabled');
  });

  test('lists every command of a multi-command module', () => {
    const summary = disableConfirmationSummary('Queue', ['queue', 'queue-admin']);
    expect(summary).toContain('`/queue`');
    expect(summary).toContain('`/queue-admin`');
  });

  test('falls back to a generic phrase when the module declares no commands', () => {
    const summary = disableConfirmationSummary('Silent', []);
    expect(summary).toContain('its commands');
    expect(summary).toContain('Silent');
  });
});

describe('disableConfirmationDescriptor', () => {
  test('uses the module display name and its commands', () => {
    const descriptor = disableConfirmationDescriptor('hello-world', {
      manifest: {
        ui: { displayName: 'Hello World' },
        name: 'hello-world',
        commands: [{ name: 'hello' }],
      },
    });
    expect(descriptor.surface).toBe('Hello World');
    expect(descriptor.summary).toContain('`/hello`');
  });

  test('falls back to the manifest name when there is no display name', () => {
    const descriptor = disableConfirmationDescriptor('x', {
      manifest: { name: 'Raw Name', commands: [] },
    });
    expect(descriptor.surface).toBe('Raw Name');
    expect(descriptor.summary).toContain('its commands');
  });

  test('falls back to the module id when there is no entry at all', () => {
    const descriptor = disableConfirmationDescriptor('missing-mod', undefined);
    expect(descriptor.surface).toBe('missing-mod');
    expect(descriptor.summary).toContain('missing-mod');
  });
});

describe('the ENABLE confirmation — the other half of a module change', () => {
  // The install used to send a bare sentence; it now uses the same descriptor shape as the disable,
  // and the two halves should read alike. Only the disable was covered.
  test('names the module and its commands', () => {
    const d = enableConfirmationDescriptor('hello-world', {
      manifest: {
        name: 'hello-world',
        ui: { displayName: 'Hello World' },
        commands: [{ name: 'hello' }],
      },
    });
    expect(d.surface).toBe('Hello World');
    expect(d.summary).toContain('Hello World');
    expect(d.summary).toContain('`/hello`');
    expect(d.summary).toContain('registered');
  });

  test('a module with no commands says "its commands" rather than listing nothing', () => {
    expect(enableConfirmationSummary('Quiet Module', [])).toContain('its commands');
  });

  test('a missing manifest falls back to the module id', () => {
    expect(enableConfirmationDescriptor('hello-world', undefined).surface).toBe('hello-world');
    expect(
      enableConfirmationDescriptor('hello-world', {
        manifest: { name: 'hello-world', commands: [] },
      }).surface,
    ).toBe('hello-world');
  });
});
