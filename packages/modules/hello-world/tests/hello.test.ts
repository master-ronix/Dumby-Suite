import { describe, expect, test } from 'vitest';
import { helloCommand } from '../src/commands/hello.command.js';

/**
 * UR-20261029-117 — the smallest module owns its own test, because the integration suite requires
 * every first-party package to carry one and a .gitkeep was never a test.
 */
describe('hello-world declares what it ships', () => {
  test('the command is declared with a name and a description', () => {
    expect(helloCommand.name).toBe('hello');
    expect(typeof helloCommand.description).toBe('string');
  });
});
