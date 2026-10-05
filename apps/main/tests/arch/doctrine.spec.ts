import { describe, expect, it } from 'vitest';
import { existsRepo, listDir } from '../spec-utils.js';
// ACC-FOUND-0002-2 — no monolith (modules isolated) and no plugin federation (one DI/event/permission/config).
describe('ACC-FOUND-0002-2 — doctrine', () => {
  it('one DI container, one event bus, one permission resolver', () => {
    expect(listDir('apps/main/src/di')).toContain('container.ts');
    expect(listDir('apps/main/src/events')).toContain('event-bus.ts');
    expect(listDir('apps/main/src/permissions')).toContain('resolver.ts');
    expect(existsRepo('docs/spec/foundations/the-unified-modular-doctrine.md')).toBe(true);
  });
});
