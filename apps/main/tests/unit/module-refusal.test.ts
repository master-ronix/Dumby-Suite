import { test, expect, describe } from 'vitest';
import { moduleRefusalDescriptor } from '../../src/rendering/confirmations.js';

/**
 * The notice a refused module change gets.
 *
 * Selecting an occupied module in /browse's dropdown used to do NOTHING: the install path threw and
 * the error propagated out of the frame handler, leaving the interaction unanswered. A refusal has to
 * be answered, and answered privately — it concerns the member who tried, not the channel.
 */
describe('a refused install is explained, not swallowed', () => {
  const entry = { manifest: { name: 'hello-world', ui: { displayName: 'Hello World' } } };

  test('a module another profile holds names the holder and the rule', () => {
    const d = moduleRefusalDescriptor('hello-world', entry, { personaId: 'p-1' });
    expect(d.surface).toBe('Hello World');
    expect(d.heading).toBe('Already held by another profile');
    expect(d.explanation).toContain('another profile');
    expect(d.explanation).toContain('one profile per server');
  });

  test("the main bot is named as such, not as 'another profile'", () => {
    const d = moduleRefusalDescriptor('hello-world', entry, { personaId: 'main' });
    expect(d.explanation).toContain('the main bot');
    expect(d.explanation).not.toContain('another profile');
  });

  test('any other failure says the install changed nothing', () => {
    const d = moduleRefusalDescriptor('hello-world', entry, new Error('boom'));
    expect(d.heading).toBe('Could not install this module');
    expect(d.explanation).toContain('Nothing was enabled');
  });

  test('a missing manifest still names the module by its id', () => {
    expect(moduleRefusalDescriptor('hello-world', undefined, new Error('boom')).surface).toBe(
      'hello-world',
    );
  });
});
