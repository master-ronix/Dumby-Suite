import { test, expect } from 'vitest';
import { MockContainer, AssertionFailedError } from '../../src/di/mock-container.js';
import { createToken } from '../../src/di/container.js';

test('assertCalled passes once a spy is invoked and fails before that', () => {
  const mc = new MockContainer();
  const spied = mc.spy('sendWelcomeMessage', (n: number) => n * 2);
  expect(() => mc.assertCalled('sendWelcomeMessage')).toThrow(AssertionFailedError);
  spied(21);
  expect(() => mc.assertCalled('sendWelcomeMessage')).not.toThrow();
});

test('assertNotCalled fails after the labeled call happens', () => {
  const mc = new MockContainer();
  mc.assertNotCalled('shouldNotHappen');
  mc.record('call', 'shouldNotHappen');
  expect(() => mc.assertNotCalled('shouldNotHappen')).toThrow(AssertionFailedError);
});

test('assertLogged matches on level and optional message substring', () => {
  const mc = new MockContainer();
  mc.record('log', 'info', ['module utility loaded']);
  expect(() => mc.assertLogged('info')).not.toThrow();
  expect(() => mc.assertLogged('info', 'utility loaded')).not.toThrow();
  expect(() => mc.assertLogged('info', 'nonexistent phrase')).toThrow(AssertionFailedError);
  expect(() => mc.assertLogged('error')).toThrow(AssertionFailedError);
});

test('assertEmitted / assertEnqueued / assertSet each check their own namespace', () => {
  const mc = new MockContainer();
  mc.record('emit', 'guild.member.joined');
  mc.record('enqueue', 'welcome-email');
  mc.record('set', 'cache:guild:123:config');

  expect(() => mc.assertEmitted('guild.member.joined')).not.toThrow();
  expect(() => mc.assertEmitted('guild.member.left')).toThrow(AssertionFailedError);

  expect(() => mc.assertEnqueued('welcome-email')).not.toThrow();
  expect(() => mc.assertEnqueued('other-queue')).toThrow(AssertionFailedError);

  expect(() => mc.assertSet('cache:guild:123:config')).not.toThrow();
  expect(() => mc.assertSet('cache:guild:999:config')).toThrow(AssertionFailedError);
});

test('reset() clears recorded calls without touching DI registrations', () => {
  const mc = new MockContainer();
  const token = createToken<string>('x');
  mc.provideStub(token, 'stub-value');
  mc.record('call', 'something');
  mc.reset();
  expect(mc.getRecorded().length).toBe(0);
  expect(mc.resolve(token)).toBe('stub-value');
});

test('MockContainer is a real Container: normal DI resolution still works', () => {
  const mc = new MockContainer();
  const token = createToken<{ greeting: string }>('greeter');
  mc.register(token, () => ({ greeting: 'hi' }));
  expect(mc.resolve(token)).toStrictEqual({ greeting: 'hi' });
});
