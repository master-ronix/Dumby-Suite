import { test, expect } from 'vitest';
import {
  sanitizeText,
  containsInjectionPattern,
  InputSanitizer,
} from '../../src/shared/utils/input-sanitizer.js';

test('normalises and strips control characters', () => {
  expect(sanitizeText('a\u0000b\u0007c')).toBe('abc');
});

test('newlines are kept only when allowed', () => {
  expect(sanitizeText('a\nb', { allowNewlines: true })).toBe('a\nb');
  expect(sanitizeText('a\nb')).toBe('ab');
});

test('bounds length to maxLength', () => {
  expect(sanitizeText('abcdef', { maxLength: 3 })).toBe('abc');
  expect(sanitizeText('abc', { maxLength: 10 })).toBe('abc');
});

test('detects injection patterns', () => {
  expect(containsInjectionPattern('hey @everyone')).toBe(true);
  expect(containsInjectionPattern('```code```')).toBe(true);
  expect(containsInjectionPattern('a {{placeholder}} b')).toBe(true);
  expect(containsInjectionPattern('hello world')).toBe(false);
});

test('InputSanitizer class exposes sanitize/isSuspicious/sanitizeStrict', () => {
  const s = new InputSanitizer();
  expect(s.sanitize('plain')).toBe('plain');
  expect(s.isSuspicious('@here hi')).toBe(true);
  expect(s.isSuspicious('clean text')).toBe(false);
  const strict = s.sanitizeStrict('@here hi');
  expect(strict).not.toContain('@here');
  expect(strict).toContain('hi');
});
