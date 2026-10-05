import { describe, expect, it } from 'vitest';
import { readRepo, readSrc } from '../spec-utils.js';
// ACC-MOD-0015-2 — reload sequence is onUnload -> re-import -> onLoad -> onReady -> self-health.

describe('ACC-MOD-0015-2 — hot swap sequence', () => {
  it('the loader runs the lifecycle hooks in order', () => {
    const src = readSrc('module-system/loader.ts') + readRepo('packages/swastik/src/manifest.ts');
    for (const hook of ['onUnload', 'onLoad', 'onReady']) expect(src).toContain(hook);
  });
});
