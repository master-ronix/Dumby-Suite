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
  /**
   * UR-20261030-118 — what a profile is CALLED is the persona module's knowledge, supplied through the
   * seam. The boot passes the resolved service; these cases pass the same contract, so the notice text
   * they assert is the text a member actually sees.
   */
  const label = (personaId: string, personaName?: string): string =>
    personaId === 'main' ? 'Dumby Profile' : (personaName ?? 'another profile');

  test('a module another profile holds names the holder and the rule', () => {
    const d = moduleRefusalDescriptor('hello-world', entry, { personaId: 'p-1' }, undefined, label);
    expect(d.surface).toBe('Hello World');
    expect(d.heading).toBe('Already held by another profile');
    expect(d.explanation).toContain('another profile');
    expect(d.explanation).toContain('one profile per server');
  });

  test('the resident bot is named Dumby Profile, not "the main bot"', () => {
    const d = moduleRefusalDescriptor(
      'hello-world',
      entry,
      { personaId: 'main' },
      undefined,
      label,
    );
    expect(d.explanation).toContain('Dumby Profile');
    expect(d.explanation).not.toContain('main bot');
  });

  test('a persona is named by HER name, from the Twill registration', () => {
    const d = moduleRefusalDescriptor(
      'hello-world',
      entry,
      { personaId: 'p-1' },
      (id) => (id === 'p-1' ? 'Magma' : undefined),
      label,
    );
    expect(d.explanation).toContain('Magma');
    expect(d.explanation).not.toContain('another profile');
  });

  test('and without her name it is still a profile, not a role', () => {
    const d = moduleRefusalDescriptor('hello-world', entry, { personaId: 'p-1' }, undefined, label);
    expect(d.explanation).toContain('another profile');
    expect(d.explanation).not.toContain('a persona');
  });

  test('any other failure says the install changed nothing', () => {
    const d = moduleRefusalDescriptor('hello-world', entry, new Error('boom'), undefined, label);
    expect(d.heading).toBe('Could not install this module');
    expect(d.explanation).toContain('Nothing was enabled');
  });

  test('a missing manifest still names the module by its id', () => {
    expect(moduleRefusalDescriptor('hello-world', undefined, new Error('boom')).surface).toBe(
      'hello-world',
    );
  });
});
