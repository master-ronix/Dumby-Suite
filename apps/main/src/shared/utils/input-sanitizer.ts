/**
 * §32.10 (Appendix C #1) — `InputSanitizer` hardens untrusted text before it is stored, logged,
 * or rendered. It normalises Unicode, strips control characters, and bounds length; it never
 * silently mangles legitimate content.
 */
export interface SanitizeOptions {
  readonly maxLength?: number;
  readonly allowNewlines?: boolean;
}

const CONTROL_ALL = /[\u0000-\u001f\u007f]/g;
const CONTROL_KEEP_WS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

// Sequences commonly used to smuggle directives or markdown/format abuse into rendered surfaces.
const INJECTION_PATTERNS: readonly RegExp[] = [
  /@(everyone|here)\b/i,
  /```/,
  /\u202e|\u202d/, // RTL/LTR override characters
  /\{\{[^}]*\}\}/, // unexpanded template placeholders
];

export function sanitizeText(input: string, options: SanitizeOptions = {}): string {
  const maxLength = options.maxLength ?? 2000;
  let out = input.normalize('NFKC');
  out = out.replace(options.allowNewlines === true ? CONTROL_KEEP_WS : CONTROL_ALL, '');
  return out.length > maxLength ? out.slice(0, maxLength) : out;
}

export function containsInjectionPattern(input: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export class InputSanitizer {
  sanitize(input: string, options: SanitizeOptions = {}): string {
    return sanitizeText(input, options);
  }

  isSuspicious(input: string): boolean {
    return containsInjectionPattern(input);
  }

  /** Sanitize, and additionally strip sequences flagged as injection attempts. */
  sanitizeStrict(input: string, options: SanitizeOptions = {}): string {
    const cleaned = sanitizeText(input, options);
    return INJECTION_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), cleaned);
  }
}
