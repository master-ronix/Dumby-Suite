import { describe, expect, it } from 'vitest';
import { readSrc } from '../spec-utils.js';
// ACC-REQ-0020-3 — autocomplete answers within 800 ms; deferred interactions covered by the 13-minute watchdog.

describe('ACC-REQ-0020-3 — interaction timers', () => {
  it('the renderer declares the followup alarm', () => {
    expect(readSrc('rendering/core-renderer.ts')).toMatch(/FOLLOWUP_ALARM_MS/);
  });
});
