import { describe, expect, test } from 'vitest';
import {
  disableConfirmationDescriptor,
  disableConfirmationSummary,
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
