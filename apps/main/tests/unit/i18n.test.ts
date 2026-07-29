import { test, expect, describe } from 'vitest';
import { I18nManager } from '../../src/i18n/i18n-manager.js';
import { formatNumber, formatDuration, formatTimestamp } from '../../src/i18n/formatters.js';

// ─── I18nManager ─────────────────────────────────────────────────────────────

describe('I18nManager', () => {
  test('returns the key as fallback when module is not registered', () => {
    const mgr = new I18nManager();
    expect(mgr.t('economy', 'reward.message')).toBe('economy.reward.message');
  });

  test('returns the key as fallback when the key is not in the bundle', () => {
    const mgr = new I18nManager();
    mgr.register('economy', { 'en-US': { 'balance.title': 'Your Balance' } });
    expect(mgr.t('economy', 'missing.key')).toBe('economy.missing.key');
  });

  test('resolves a registered translation', () => {
    const mgr = new I18nManager();
    mgr.register('economy', { 'en-US': { 'balance.title': 'Your Balance' } });
    expect(mgr.t('economy', 'balance.title')).toBe('Your Balance');
  });

  test('interpolates {{param}} placeholders', () => {
    const mgr = new I18nManager();
    mgr.register('leveling', { 'en-US': { 'levelup': 'You reached level {{level}}!' } });
    expect(mgr.t('leveling', 'levelup', { level: 5 })).toBe('You reached level 5!');
  });

  test('interpolates multiple params', () => {
    const mgr = new I18nManager();
    mgr.register('economy', { 'en-US': { 'transfer': '{{from}} sent {{amount}} coins to {{to}}' } });
    expect(mgr.t('economy', 'transfer', { from: 'Alice', amount: 100, to: 'Bob' }))
      .toBe('Alice sent 100 coins to Bob');
  });

  test('falls back to en-US when requested locale is unavailable', () => {
    const mgr = new I18nManager();
    mgr.register('economy', { 'en-US': { 'balance': 'Balance' } });
    expect(mgr.t('economy', 'balance', {}, 'fr-FR')).toBe('Balance');
  });

  test('re-registering a module replaces the previous bundle', () => {
    const mgr = new I18nManager();
    mgr.register('economy', { 'en-US': { 'msg': 'First' } });
    mgr.register('economy', { 'en-US': { 'msg': 'Second' } });
    expect(mgr.t('economy', 'msg')).toBe('Second');
  });
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  test('formats a simple integer', () => {
    expect(formatNumber(1000)).toMatch(/1[,.]?000/);
  });

  test('formats a large number with locale separator', () => {
    const result = formatNumber(1_234_567, 'en-US');
    expect(result).toContain('234');
  });

  test('defaults to en-US locale', () => {
    expect(() => formatNumber(42)).not.toThrow();
  });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
  test('returns ms for durations under 1 second', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  test('returns seconds for durations under 1 minute', () => {
    expect(formatDuration(2500)).toBe('2.5s');
  });

  test('returns minutes and seconds for longer durations', () => {
    expect(formatDuration(90_000)).toBe('1m 30s');
  });

  test('handles exactly 1 minute', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
  });

  test('handles 0ms', () => {
    expect(formatDuration(0)).toBe('0ms');
  });

  test('handles exactly 1 second', () => {
    expect(formatDuration(1000)).toBe('1.0s');
  });
});

// ─── formatTimestamp ──────────────────────────────────────────────────────────

describe('formatTimestamp', () => {
  test('formats a date without throwing', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(() => formatTimestamp(date)).not.toThrow();
  });

  test('returns a non-empty string', () => {
    const date = new Date('2026-07-28T12:00:00Z');
    const result = formatTimestamp(date, 'en-US');
    expect(result.length).toBeGreaterThan(0);
  });

  test('accepts custom DateTimeFormat options', () => {
    const date = new Date('2026-01-15T00:00:00Z');
    const result = formatTimestamp(date, 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    expect(result).toContain('2026');
  });
});
