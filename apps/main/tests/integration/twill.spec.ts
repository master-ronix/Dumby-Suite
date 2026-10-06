import { describe, expect, it } from 'vitest';
import { existsRepo } from '../spec-utils.js';
// ACC-OPS-0035-1 — a Twill persona is bring-your-own-identity and bound to exactly one server.

describe('ACC-OPS-0035-1 — Twill', () => {
  it('the persona subsystem and entrypoint exist', () => {
    expect(existsRepo('apps/main/src/personas/persona.ts')).toBe(true);
    expect(existsRepo('apps/main/src/entry/twill.ts')).toBe(true);
  });
});
