import { describe, expect, test } from 'vitest';
import {
  ClaiSessionLimiter,
  stripAnsi,
} from '../../src/entry/clai-session-limits.js';

describe('CLAI ANSI/control stripping (UR-C-06)', () => {
  test('strips CSI sequences', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
  });

  test('strips OSC sequences terminated by BEL or ST', () => {
    expect(stripAnsi('a\x1b]0;title\x07b')).toBe('ab');
    expect(stripAnsi('a\x1b]0;title\x1b\\b')).toBe('ab');
  });

  test('strips other two-char escapes and stray control characters', () => {
    expect(stripAnsi('\x1b7save\x1b8\x00\x08\x7f')).toBe('save');
  });

  test('keeps ordinary text, tabs and newlines', () => {
    expect(stripAnsi('power-engine ping\t{}\n')).toBe('power-engine ping\t{}\n');
  });
});

describe('CLAI session limiter (UR-C-06)', () => {
  test('admits up to maxSessions and then refuses', () => {
    const limiter = new ClaiSessionLimiter(2, 100);
    const a = limiter.open();
    const b = limiter.open();
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(limiter.open()).toBeNull();
    expect(limiter.activeSessions).toBe(2);
    limiter.close(a as string);
    expect(limiter.open()).not.toBeNull();
  });

  test('closing an unknown token is a no-op', () => {
    const limiter = new ClaiSessionLimiter(1, 100);
    limiter.close('nope');
    expect(limiter.activeSessions).toBe(0);
  });

  test('account returns false once the byte budget is exceeded', () => {
    const limiter = new ClaiSessionLimiter(1, 10);
    const token = limiter.open() as string;
    expect(limiter.account(token, 6)).toBe(true);
    expect(limiter.account(token, 4)).toBe(true);
    expect(limiter.account(token, 1)).toBe(false);
  });
});
